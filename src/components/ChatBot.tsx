import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { hospitals, getDistance } from "@/data/hospitals";


interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const USER_LAT = 28.6139;
const USER_LNG = 77.209;

type EmergencyLevel = "Low" | "Moderate" | "Critical";

interface ResponsePayload {
  possibleIssue: string;
  precautions: string[];
  actions: string[];
  level: EmergencyLevel;
  hospitalAction: string[];
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function formatResponse(payload: ResponsePayload): string {
  const emergencyLevel = payload.level.toUpperCase();
  const criticalSuffix = payload.level === "Critical"
    ? "\nSearching nearby hospitals with ICU and oxygen support..."
    : "";

  return [
    `Possible Issue:\n${payload.possibleIssue}`,
    "",
    "Immediate Precautions:",
    ...payload.precautions.map((item) => `- ${item}`),
    "",
    "What To Do Right Now:",
    ...payload.actions.map((item) => `- ${item}`),
    "",
    `Emergency Level:\n${emergencyLevel}`,
    "",
    "Recommended Hospital Action:",
    ...payload.hospitalAction.map((item) => `- ${item}`),
  ].join("\n") + criticalSuffix;
}

function generateResponse(query: string): string {
  const q = query.toLowerCase();
  const normalized = normalizeText(query);

  const nonHealthReply = "I can only help with healthcare and emergency-related assistance. Please ask about symptoms, precautions, hospitals, blood, ICU beds, oxygen, or other medical support.";

  const symptomKeywords = [
    "fever",
    "headache",
    "cold",
    "cough",
    "chest pain",
    "chest tight",
    "tight chest",
    "heart pain",
    "breathing",
    "cant breathe",
    "can t breathe",
    "cannot breathe",
    "burn",
    "choking",
    "bleeding",
    "vomiting",
    "fracture",
    "allergic",
    "stroke",
    "seizure",
    "pregnancy",
    "labor",
    "contractions",
    "overdose",
    "poison",
    "poisoning",
    "drowning",
    "heatstroke",
    "heat stroke",
    "trauma",
    "accident",
    "injury",
    "dizzy",
    "dizziness",
    "fainted",
    "fainting",
    "passed out",
    "weak",
    "weakness",
    "panic",
    "panic attack",
    "stomach pain",
    "abdominal pain",
    "low sugar",
    "high bp",
    "high blood pressure",
  ];

  const healthKeywords = [
    "hospital",
    "doctor",
    "specialist",
    "emergency",
    "urgent",
    "ambulance",
    "blood",
    "icu",
    "oxygen",
    "ventilator",
    "medicine",
    "vaccine",
    "vaccination",
    "symptom",
    "first aid",
    "precaution",
    "pain",
  ];

  const isHealthRelated = healthKeywords.some((k) => normalized.includes(k))
    || symptomKeywords.some((k) => normalized.includes(k));
  if (!isHealthRelated) return nonHealthReply;

  // Blood query
  const bloodMatch = q.match(/([ao]|ab)[+-]/i) || q.match(/(a|b|o|ab)\s*(\+|positive|-|negative)/i);
  if (bloodMatch || q.includes("blood")) {
    let group = "";
    if (bloodMatch) {
      let raw = bloodMatch[0].toUpperCase().replace("POSITIVE", "+").replace("NEGATIVE", "-").replace(/\s/g, "");
      if (!raw.includes("+") && !raw.includes("-")) raw += "+";
      group = raw;
    }
    if (!group && q.includes("blood")) group = "O+";

    const results = hospitals
      .filter(h => (h.bloodAvailability[group] || 0) > 0)
      .map(h => ({
        ...h,
        dist: getDistance(USER_LAT, USER_LNG, h.lat, h.lng),
        units: h.bloodAvailability[group],
      }))
      .sort((a, b) => a.dist - b.dist);

    if (results.length === 0) {
      return formatResponse({
        possibleIssue: `Need ${group} blood`,
        precautions: ["If this is for a medical emergency, contact emergency services immediately."],
        actions: ["Call your nearest emergency department for urgent guidance."],
        level: "Critical",
        hospitalAction: ["No nearby hospitals show available units right now."]
      });
    }

    return formatResponse({
      possibleIssue: `Need ${group} blood`,
      precautions: ["If the patient is unstable or bleeding heavily, call emergency services now."],
      actions: ["Call the listed hospitals to reserve units and confirm availability."],
      level: "Critical",
      hospitalAction: results.map((h) =>
        `${h.name} - ${h.units} units (${h.dist.toFixed(1)} km) | ${h.phone}`
      ),
    });
  }

  // Doctor query
  if (normalized.includes("doctor") || normalized.includes("specialist") || hospitals.some(h => h.doctors.some(d => normalized.includes(d.specialty.toLowerCase())))) {
    const specialty = hospitals.flatMap(h => h.doctors).find(d => q.includes(d.specialty.toLowerCase()))?.specialty;
    if (specialty) {
      const results = hospitals
        .filter(h => h.doctors.some(d => d.specialty === specialty && d.available))
        .map(h => ({ ...h, dist: getDistance(USER_LAT, USER_LNG, h.lat, h.lng) }))
        .sort((a, b) => a.dist - b.dist);

      if (results.length === 0) {
        return formatResponse({
          possibleIssue: `Need a ${specialty} specialist`,
          precautions: ["If symptoms are severe, seek emergency care immediately."],
          actions: ["Call nearby hospitals to ask for on-call coverage."],
          level: "Moderate",
          hospitalAction: ["No nearby specialists are currently marked available."]
        });
      }

      return formatResponse({
        possibleIssue: `Need a ${specialty} specialist`,
        precautions: ["Seek urgent care if symptoms worsen or are severe."],
        actions: ["Call the listed hospitals to confirm specialist availability."],
        level: "Moderate",
        hospitalAction: results.map((h) => `${h.name} - ${h.dist.toFixed(1)} km | ${h.phone}`),
      });
    }
    return formatResponse({
      possibleIssue: "Need a specialist consultation",
      precautions: ["If symptoms are severe, seek emergency care."],
      actions: ["Tell me the specialty (e.g., Cardiology, Neurology, Pediatrics)."],
      level: "Moderate",
      hospitalAction: ["I can check hospital availability once you specify the specialty."]
    });
  }

  // Equipment query
  if (normalized.includes("ambulance")) {
    const results = hospitals
      .filter(h => h.emergencyServices)
      .map(h => ({ ...h, dist: getDistance(USER_LAT, USER_LNG, h.lat, h.lng) }))
      .sort((a, b) => a.dist - b.dist);

    return formatResponse({
      possibleIssue: "Ambulance support needed",
      precautions: ["Keep the person still and calm if they are injured or faint."],
      actions: ["Call emergency services immediately for ambulance dispatch."],
      level: "Critical",
      hospitalAction: results.map((h) => `${h.name} - ${h.dist.toFixed(1)} km | ${h.phone}`),
    });
  }

  if (normalized.includes("oxygen")) {
    const results = hospitals
      .filter(h => h.emergencyServices)
      .map(h => ({ ...h, dist: getDistance(USER_LAT, USER_LNG, h.lat, h.lng) }))
      .sort((a, b) => a.dist - b.dist);

    return formatResponse({
      possibleIssue: "Oxygen support needed",
      precautions: ["Keep the person sitting upright and calm."],
      actions: ["Go to the nearest emergency hospital or call emergency services."],
      level: "Critical",
      hospitalAction: results.map((h) => `${h.name} - ${h.dist.toFixed(1)} km | ${h.phone}`),
    });
  }

  const equipNames = ["ventilator", "icu bed", "icu", "mri", "ct scanner", "x-ray", "ultrasound", "dialysis", "ecmo"];
  const eqMatch = equipNames.find(e => normalized.includes(e));
  if (eqMatch) {
    const eqName = hospitals.flatMap(h => h.equipment).find(e => e.name.toLowerCase().includes(eqMatch))?.name || eqMatch;
    const results = hospitals
      .filter(h => h.equipment.some(e => e.name.toLowerCase().includes(eqMatch) && e.available > 0))
      .map(h => ({
        ...h,
        dist: getDistance(USER_LAT, USER_LNG, h.lat, h.lng),
        avail: h.equipment.find(e => e.name.toLowerCase().includes(eqMatch))!,
      }))
      .sort((a, b) => a.dist - b.dist);

    if (results.length === 0) {
      return formatResponse({
        possibleIssue: `Need ${eqName} availability`,
        precautions: ["If this is life-threatening, call emergency services immediately."],
        actions: ["Contact the nearest emergency department for transfer guidance."],
        level: "Critical",
        hospitalAction: ["No nearby hospitals show availability right now."]
      });
    }

    return formatResponse({
      possibleIssue: `Need ${eqName} availability`,
      precautions: ["If the patient is unstable, call emergency services now."],
      actions: ["Call hospitals below to confirm bed/equipment availability."],
      level: "Critical",
      hospitalAction: results.map((h) =>
        `${h.name} - ${h.avail.available}/${h.avail.total} available (${h.dist.toFixed(1)} km)`
      ),
    });
  }

  // Vaccine query
  const vaccineNames = [
    "hepatitis b vaccine",
    "tetanus vaccine",
    "polio vaccine",
    "corona vaccine",
  ];
  const vaccineMatch = vaccineNames.find(v => normalized.includes(v));
  if (normalized.includes("vaccine") || normalized.includes("vaccination") || vaccineMatch) {
    const results = hospitals
      .filter(h => h.vaccines.some(v => v.available && (!vaccineMatch || v.name.toLowerCase() === vaccineMatch)))
      .map(h => ({ ...h, dist: getDistance(USER_LAT, USER_LNG, h.lat, h.lng) }))
      .sort((a, b) => a.dist - b.dist);

    const vaccineLabel = vaccineMatch
      ? vaccineMatch.split(" ").map(word => word[0].toUpperCase() + word.slice(1)).join(" ")
      : "vaccine availability";

    if (results.length === 0) {
      return formatResponse({
        possibleIssue: `Need ${vaccineLabel}`,
        precautions: ["Carry your vaccination card if you have one.", "Follow hospital guidance for eligibility."],
        actions: ["Call nearby hospitals or vaccination centers to confirm availability."],
        level: "Low",
        hospitalAction: ["No nearby hospitals show availability right now."]
      });
    }

    return formatResponse({
      possibleIssue: `Need ${vaccineLabel}`,
      precautions: ["Check eligibility and timing with a healthcare professional.", "Carry ID and prior vaccination records."],
      actions: ["Call the listed hospitals to confirm slots and stock."],
      level: "Low",
      hospitalAction: results.map((h) => `${h.name} - ${h.dist.toFixed(1)} km | ${h.phone}`),
    });
  }

  // Medicine query
  const meds = ["paracetamol", "amoxicillin", "insulin", "remdesivir", "azithromycin", "metformin", "tocilizumab"];
  const medMatch = meds.find(m => q.includes(m));
  if (medMatch || q.includes("medicine")) {
    if (medMatch) {
      const results = hospitals
        .filter(h => h.medicines.some(m => m.name.toLowerCase() === medMatch && m.available))
        .map(h => ({ ...h, dist: getDistance(USER_LAT, USER_LNG, h.lat, h.lng) }))
        .sort((a, b) => a.dist - b.dist);

      const medName = medMatch.charAt(0).toUpperCase() + medMatch.slice(1);
      if (results.length === 0) {
        return formatResponse({
          possibleIssue: `Need ${medName}`,
          precautions: ["Do not start or stop medication without medical advice."],
          actions: ["Call nearby hospitals or pharmacies for alternatives."],
          level: "Low",
          hospitalAction: ["No nearby hospitals show availability right now."]
        });
      }

      return formatResponse({
        possibleIssue: `Need ${medName}`,
        precautions: ["Follow existing prescriptions and dosing instructions."],
        actions: ["Call hospitals below to confirm stock."],
        level: "Low",
        hospitalAction: results.map((h) => `${h.name} - ${h.dist.toFixed(1)} km`),
      });
    }
    return formatResponse({
      possibleIssue: "Need medicine availability",
      precautions: ["Only take medicines as prescribed."],
      actions: ["Tell me the medicine name to check availability."],
      level: "Low",
      hospitalAction: ["I can search nearby hospitals once you specify the medicine."]
    });
  }

  // Emergency
  if (normalized.includes("emergency") || normalized.includes("urgent")) {
    const results = hospitals
      .filter(h => h.emergencyServices)
      .map(h => ({ ...h, dist: getDistance(USER_LAT, USER_LNG, h.lat, h.lng) }))
      .sort((a, b) => a.dist - b.dist);

    return formatResponse({
      possibleIssue: "Emergency care needed",
      precautions: ["Call emergency services immediately if symptoms are severe."],
      actions: ["Go to the nearest emergency department now."],
      level: "Critical",
      hospitalAction: results.map((h) => `${h.name} - ${h.dist.toFixed(1)} km | ${h.phone}`),
    });
  }

  // Symptom & precaution advice
  const symptomAdvice: Record<string, ResponsePayload> = {
    fever: {
      possibleIssue: "Fever",
      precautions: [
        "Rest and avoid exertion.",
        "Drink fluids like water or ORS.",
        "Use light clothing and cool compresses.",
      ],
      actions: [
        "Monitor temperature regularly.",
        "Seek care if fever is very high or lasts over 3 days.",
      ],
      level: "Moderate",
      hospitalAction: ["Visit a clinic or hospital if fever is severe or persistent."],
    },
    headache: {
      possibleIssue: "Headache",
      precautions: [
        "Rest in a quiet, dark room.",
        "Stay hydrated.",
        "Use a cold or warm compress.",
      ],
      actions: [
        "Take prescribed pain relief if safe for you.",
        "Seek urgent care for sudden severe headache or confusion.",
      ],
      level: "Moderate",
      hospitalAction: ["Go to emergency care if symptoms are sudden or severe."],
    },
    cold: {
      possibleIssue: "Common cold",
      precautions: [
        "Rest and stay warm.",
        "Drink fluids to stay hydrated.",
        "Cover coughs and wash hands often.",
      ],
      actions: [
        "Use saline spray or steam inhalation for congestion.",
        "Seek care if you have high fever, chest pain, or trouble breathing.",
      ],
      level: "Low",
      hospitalAction: ["Visit a clinic if symptoms worsen or last over 7-10 days."],
    },
    cough: {
      possibleIssue: "Cough",
      precautions: [
        "Stay hydrated and rest.",
        "Avoid smoke and irritants.",
      ],
      actions: [
        "Seek care if cough is severe, with fever, or lasting over 2 weeks.",
        "Go to emergency care for trouble breathing or chest pain.",
      ],
      level: "Moderate",
      hospitalAction: ["Visit a clinic for persistent cough or worsening symptoms."],
    },
    "chest pain": {
      possibleIssue: "Possible cardiac or respiratory emergency.",
      precautions: [
        "Sit upright.",
        "Stay calm.",
        "Avoid physical activity.",
        "Loosen tight clothing.",
      ],
      actions: [
        "Check oxygen level if available.",
        "Do not drive yourself.",
        "Ask someone nearby for assistance.",
        "Call emergency services immediately.",
      ],
      level: "Critical",
      hospitalAction: ["Visit nearest emergency hospital immediately.", "Request ambulance support."],
    },
    breathing: {
      possibleIssue: "Difficulty breathing",
      precautions: [
        "Sit upright and lean forward slightly.",
        "Use prescribed inhaler if you have one.",
      ],
      actions: [
        "Call emergency services immediately if breathing is severe or worsening.",
        "Move to fresh air if possible.",
        "Check oxygen level if available.",
      ],
      level: "Critical",
      hospitalAction: ["Seek immediate emergency care and oxygen support."],
    },
    burn: {
      possibleIssue: "Burn injury",
      precautions: [
        "Cool the burn under running water for 10-20 minutes.",
        "Do not apply ice or creams.",
      ],
      actions: [
        "Cover with a clean non-stick dressing.",
        "Seek care if the burn is large or on face/hands/joints.",
      ],
      level: "Moderate",
      hospitalAction: ["Visit a hospital for large or deep burns."],
    },
    choking: {
      possibleIssue: "Choking",
      precautions: [
        "Encourage coughing if the person can breathe.",
      ],
      actions: [
        "Give back blows and abdominal thrusts if trained.",
        "Call emergency services immediately if breathing stops.",
      ],
      level: "Critical",
      hospitalAction: ["Emergency department care is required if the airway is compromised."],
    },
    bleeding: {
      possibleIssue: "Active bleeding",
      precautions: [
        "Apply firm pressure with a clean cloth.",
        "Keep the person warm and calm.",
      ],
      actions: [
        "Elevate the injured area if possible.",
        "Call emergency services if bleeding is heavy or persistent.",
      ],
      level: "Critical",
      hospitalAction: ["Go to the nearest emergency department immediately."],
    },
    vomiting: {
      possibleIssue: "Vomiting",
      precautions: [
        "Sip small amounts of water or ORS.",
        "Avoid heavy foods for a few hours.",
      ],
      actions: [
        "Seek care if vomiting lasts over 24 hours or shows blood.",
      ],
      level: "Moderate",
      hospitalAction: ["Visit a clinic or hospital if symptoms worsen."],
    },
    fracture: {
      possibleIssue: "Possible fracture",
      precautions: [
        "Do not move the injured limb.",
        "Immobilize with a splint if trained.",
      ],
      actions: [
        "Apply a wrapped ice pack for pain.",
        "Go to a hospital for imaging and treatment.",
      ],
      level: "Moderate",
      hospitalAction: ["Seek urgent orthopedic evaluation."],
    },
    "allergic reaction": {
      possibleIssue: "Allergic reaction",
      precautions: [
        "Remove the trigger if known.",
        "Use antihistamine if already prescribed.",
      ],
      actions: [
        "Call emergency services if there is swelling of the throat or difficulty breathing.",
      ],
      level: "Critical",
      hospitalAction: ["Go to emergency care for possible anaphylaxis treatment."],
    },
    "chest tightness": {
      possibleIssue: "Possible cardiac or respiratory emergency.",
      precautions: [
        "Sit upright.",
        "Stay calm.",
        "Avoid physical activity.",
        "Loosen tight clothing.",
      ],
      actions: [
        "Check oxygen level if available.",
        "Do not drive yourself.",
        "Ask someone nearby for assistance.",
        "Call emergency services immediately.",
      ],
      level: "Critical",
      hospitalAction: ["Visit nearest emergency hospital immediately.", "Request ambulance support."],
    },
    stroke: {
      possibleIssue: "Possible stroke",
      precautions: [
        "Keep the person seated and calm.",
        "Do not give food or drink.",
      ],
      actions: [
        "Call emergency services immediately.",
        "Note the time symptoms started.",
      ],
      level: "Critical",
      hospitalAction: ["Go to the nearest emergency department immediately."],
    },
    seizure: {
      possibleIssue: "Seizure",
      precautions: [
        "Clear nearby objects to prevent injury.",
        "Do not restrain the person or put anything in the mouth.",
      ],
      actions: [
        "Call emergency services if seizure lasts over 5 minutes or repeats.",
        "Place them on their side after the seizure stops.",
      ],
      level: "Critical",
      hospitalAction: ["Emergency evaluation is recommended after a seizure."],
    },
    pregnancy: {
      possibleIssue: "Pregnancy-related emergency",
      precautions: [
        "If there is heavy bleeding, severe pain, or fainting, treat as an emergency.",
        "Keep the person resting on their left side if possible.",
      ],
      actions: [
        "Call emergency services for severe bleeding, severe pain, or reduced fetal movement.",
        "Go to a hospital with maternity and emergency services.",
      ],
      level: "Critical",
      hospitalAction: ["Seek immediate obstetric and emergency care."],
    },
    labor: {
      possibleIssue: "Active labor",
      precautions: [
        "Stay calm and prepare for transport.",
        "Do not eat heavy food if delivery may be soon.",
      ],
      actions: [
        "Go to the nearest hospital with maternity services.",
        "Call emergency services if there is heavy bleeding or severe pain.",
      ],
      level: "Critical",
      hospitalAction: ["Go to a maternity-equipped hospital immediately."],
    },
    contractions: {
      possibleIssue: "Possible labor contractions",
      precautions: [
        "Track contraction timing and intensity.",
        "Stay hydrated and rest.",
      ],
      actions: [
        "Go to the hospital if contractions are regular and close together.",
        "Call emergency services for heavy bleeding or severe symptoms.",
      ],
      level: "Moderate",
      hospitalAction: ["Visit a maternity hospital for assessment."],
    },
    overdose: {
      possibleIssue: "Possible overdose",
      precautions: [
        "Do not give food, drink, or additional medicines unless advised by professionals.",
        "If unconscious, place the person on their side.",
      ],
      actions: [
        "Call emergency services immediately.",
        "If safe, provide the substance name and time taken.",
      ],
      level: "Critical",
      hospitalAction: ["Go to the nearest emergency department now."],
    },
    poison: {
      possibleIssue: "Possible poisoning",
      precautions: [
        "Do not induce vomiting unless instructed by emergency services.",
        "Remove any remaining substance from the mouth if safe.",
      ],
      actions: [
        "Call emergency services immediately.",
        "Bring the container or substance information to the hospital.",
      ],
      level: "Critical",
      hospitalAction: ["Emergency care is required for poisoning."],
    },
    poisoning: {
      possibleIssue: "Possible poisoning",
      precautions: [
        "Do not induce vomiting unless instructed by emergency services.",
        "Remove any remaining substance from the mouth if safe.",
      ],
      actions: [
        "Call emergency services immediately.",
        "Bring the container or substance information to the hospital.",
      ],
      level: "Critical",
      hospitalAction: ["Emergency care is required for poisoning."],
    },
    drowning: {
      possibleIssue: "Possible drowning",
      precautions: [
        "Move the person to a safe area and keep them warm.",
        "Do not delay emergency care even if they seem to recover.",
      ],
      actions: [
        "Call emergency services immediately.",
        "Begin CPR if the person is not breathing and you are trained.",
      ],
      level: "Critical",
      hospitalAction: ["Emergency evaluation is required after any drowning event."],
    },
    heatstroke: {
      possibleIssue: "Heatstroke",
      precautions: [
        "Move to a cool place and remove excess clothing.",
        "Cool the body with wet cloths or fanning.",
      ],
      actions: [
        "Call emergency services immediately.",
        "Do not give fluids if the person is confused or unconscious.",
      ],
      level: "Critical",
      hospitalAction: ["Emergency care is required for heatstroke."],
    },
    "heat stroke": {
      possibleIssue: "Heatstroke",
      precautions: [
        "Move to a cool place and remove excess clothing.",
        "Cool the body with wet cloths or fanning.",
      ],
      actions: [
        "Call emergency services immediately.",
        "Do not give fluids if the person is confused or unconscious.",
      ],
      level: "Critical",
      hospitalAction: ["Emergency care is required for heatstroke."],
    },
    trauma: {
      possibleIssue: "Traumatic injury",
      precautions: [
        "Do not move the person if there may be neck or spine injury.",
        "Control bleeding with firm pressure.",
      ],
      actions: [
        "Call emergency services immediately.",
        "Keep the person still and warm until help arrives.",
      ],
      level: "Critical",
      hospitalAction: ["Go to the nearest emergency department immediately."],
    },
    accident: {
      possibleIssue: "Accident-related injury",
      precautions: [
        "Do not move the person if there may be head, neck, or spine injury.",
        "Apply pressure to control bleeding.",
      ],
      actions: [
        "Call emergency services immediately.",
        "Wait for ambulance support if symptoms are severe.",
      ],
      level: "Critical",
      hospitalAction: ["Emergency department evaluation is recommended."],
    },
    injury: {
      possibleIssue: "Injury",
      precautions: [
        "Keep the person still if the injury is severe.",
        "Control bleeding with clean pressure.",
      ],
      actions: [
        "Call emergency services for severe pain, bleeding, or head injury.",
        "Go to the nearest emergency department.",
      ],
      level: "Moderate",
      hospitalAction: ["Seek urgent evaluation based on severity."],
    },
    dizziness: {
      possibleIssue: "Dizziness",
      precautions: [
        "Sit or lie down to prevent falls.",
        "Sip water if able.",
      ],
      actions: [
        "Seek urgent care if dizziness is severe, persistent, or with chest pain.",
      ],
      level: "Moderate",
      hospitalAction: ["Visit a clinic or emergency care if symptoms worsen."],
    },
    fainting: {
      possibleIssue: "Fainting or loss of consciousness",
      precautions: [
        "Lay the person on their back with legs elevated if safe.",
        "Loosen tight clothing.",
      ],
      actions: [
        "Call emergency services if the person is not waking quickly.",
        "Do not give food or drink until fully alert.",
      ],
      level: "Critical",
      hospitalAction: ["Emergency evaluation is recommended after fainting."],
    },
    weakness: {
      possibleIssue: "Weakness or fatigue",
      precautions: [
        "Rest and hydrate.",
      ],
      actions: [
        "Seek care if weakness is sudden, one-sided, or severe.",
      ],
      level: "Moderate",
      hospitalAction: ["Visit a clinic or emergency care if symptoms worsen."],
    },
    "panic attack": {
      possibleIssue: "Possible panic attack",
      precautions: [
        "Sit upright and focus on slow breathing.",
        "Move to a calm, quiet area if possible.",
      ],
      actions: [
        "Seek emergency care if chest pain, fainting, or breathing difficulty occurs.",
      ],
      level: "Moderate",
      hospitalAction: ["Visit urgent care if symptoms are severe or recurrent."],
    },
    "stomach pain": {
      possibleIssue: "Stomach or abdominal pain",
      precautions: [
        "Avoid heavy food and alcohol.",
        "Rest and stay hydrated.",
      ],
      actions: [
        "Seek emergency care for severe pain, vomiting blood, or black stools.",
      ],
      level: "Moderate",
      hospitalAction: ["Visit a clinic or emergency care if pain is severe."],
    },
    "low sugar": {
      possibleIssue: "Low blood sugar",
      precautions: [
        "If the person is conscious, give a fast-acting sugar source.",
        "Do not give food or drink if unconscious.",
      ],
      actions: [
        "Call emergency services if the person is confused or not improving quickly.",
      ],
      level: "Critical",
      hospitalAction: ["Emergency evaluation is recommended for low blood sugar."],
    },
    "high bp": {
      possibleIssue: "High blood pressure",
      precautions: [
        "Keep the person calm and resting.",
        "Avoid exertion and caffeine.",
      ],
      actions: [
        "Seek emergency care if there is chest pain, severe headache, or vision changes.",
      ],
      level: "Moderate",
      hospitalAction: ["Visit a clinic or emergency care based on severity."],
    },
    "high blood pressure": {
      possibleIssue: "High blood pressure",
      precautions: [
        "Keep the person calm and resting.",
        "Avoid exertion and caffeine.",
      ],
      actions: [
        "Seek emergency care if there is chest pain, severe headache, or vision changes.",
      ],
      level: "Moderate",
      hospitalAction: ["Visit a clinic or emergency care based on severity."],
    },
  };

  const symptomAliases: Record<string, string[]> = {
    fever: ["fever", "temperature"],
    headache: ["headache", "head hurts", "head pain"],
    cold: ["cold", "runny nose", "sneezing", "blocked nose"],
    cough: ["cough", "coughing"],
    "chest pain": ["chest pain", "heart pain", "pain in chest"],
    "chest tightness": ["chest tightness", "tight chest", "hard in my chest", "hard in chest", "hard chest"],
    breathing: ["breathing", "breathing issue", "cant breathe", "can t breathe", "cannot breathe", "short of breath"],
    burn: ["burn", "burns"],
    choking: ["choking", "choke"],
    bleeding: ["bleeding", "bleed"],
    vomiting: ["vomiting", "vomit", "throwing up"],
    fracture: ["fracture", "broken bone"],
    "allergic reaction": ["allergic", "allergy", "anaphylaxis"],
    stroke: ["stroke", "face droop", "slurred speech", "arm weakness"],
    seizure: ["seizure", "fits", "convulsion"],
    pregnancy: ["pregnancy", "pregnant", "pregnancy emergency"],
    labor: ["labor", "labour", "water broke"],
    contractions: ["contractions"],
    overdose: ["overdose", "over dose"],
    poison: ["poison", "poisoning"],
    drowning: ["drowning", "near drowning"],
    heatstroke: ["heatstroke", "heat stroke", "overheated"],
    trauma: ["trauma", "accident", "injury", "crash"],
    dizziness: ["dizzy", "dizziness", "lightheaded"],
    fainting: ["fainted", "fainting", "passed out", "unconscious"],
    weakness: ["weak", "weakness", "feeling weak"],
    "panic attack": ["panic", "panic attack", "anxiety attack"],
    "stomach pain": ["stomach pain", "abdominal pain", "stomach ache", "belly pain"],
    "low sugar": ["low sugar", "low glucose", "hypoglycemia"],
    "high bp": ["high bp", "high blood pressure", "hypertension"],
  };

  const matchedSymptom = Object.keys(symptomAdvice).find((key) =>
    includesAny(normalized, symptomAliases[key] || [key])
  );
  if (matchedSymptom) {
    const nearbyHospitals = hospitals
      .map(h => ({ ...h, dist: getDistance(USER_LAT, USER_LNG, h.lat, h.lng) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 2);

    return formatResponse({
      ...symptomAdvice[matchedSymptom],
      hospitalAction: [
        ...symptomAdvice[matchedSymptom].hospitalAction,
        ...nearbyHospitals.map((h) => `${h.name} - ${h.dist.toFixed(1)} km | ${h.phone}`),
      ],
    });
  }

  // Precaution / symptom generic
  if (q.includes("precaution") || q.includes("what to do") || q.includes("first aid") || q.includes("help me")) {
    return formatResponse({
      possibleIssue: "Need first-response guidance",
      precautions: ["Share the main symptom (fever, chest pain, breathing trouble, bleeding, etc.)."],
      actions: ["Describe what is happening and how long it has been going on."],
      level: "Moderate",
      hospitalAction: ["I can recommend nearby hospitals once I know the symptom."],
    });
  }

  return formatResponse({
    possibleIssue: "Medical resource or symptom guidance",
    precautions: ["If symptoms are severe, call emergency services immediately."],
    actions: ["Ask about blood, ICU beds, oxygen, ventilators, vaccines, medicines, or symptoms."],
    level: "Moderate",
    hospitalAction: ["I can list nearby hospitals and emergency resources."],
  });
}

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: "Hi! I'm your **Emergency Healthcare AI Assistant**. Ask about symptoms or resources like blood, ICU beds, oxygen, ventilators, vaccines, medicines, or nearby hospitals. I'll respond in a short emergency-focused format." },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const finalResponse = generateResponse(input);

    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: finalResponse,
    };

    setMessages((prev) => [...prev, botMsg]);
  };

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-elevated flex items-center justify-center"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] bg-card rounded-3xl shadow-elevated border border-border flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-primary/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-card-foreground">Emergency Assistant</h3>
                  <p className="text-xs text-muted-foreground">Symptoms and hospital resources</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-primary/10" : "bg-accent/10"
                    }`}>
                    {msg.role === "user" ? <User className="w-3.5 h-3.5 text-primary" /> : <Bot className="w-3.5 h-3.5 text-accent" />}
                  </div>
                  <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted text-card-foreground rounded-tl-sm"
                    }`}>
                    <div className="prose prose-sm [&>p]:m-0 [&>ul]:my-1 [&>ul]:pl-4"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Describe symptoms or ask about blood, ICU, oxygen..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatBot;
