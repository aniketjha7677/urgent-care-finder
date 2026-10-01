import { cn } from "@/lib/utils";

export type LandingTheme = "dark" | "light";

interface ThemeToggleProps {
	value: LandingTheme;
	onChange: (nextTheme: LandingTheme) => void;
	className?: string;
}

const ThemeToggle = ({ value, onChange, className }: ThemeToggleProps) => {
	return (
		<div
			className={cn(
				"flex items-center gap-1 rounded-full border border-border bg-secondary/60 p-1 text-xs font-semibold",
				className,
			)}
		>
			<button
				type="button"
				onClick={() => onChange("dark")}
				className={cn(
					"rounded-full px-2.5 py-1 transition-colors",
					value === "dark"
						? "bg-primary text-primary-foreground"
						: "text-muted-foreground hover:text-foreground",
				)}
			>
				🌙 Dark
			</button>
			<button
				type="button"
				onClick={() => onChange("light")}
				className={cn(
					"rounded-full px-2.5 py-1 transition-colors",
					value === "light"
						? "bg-primary text-primary-foreground"
						: "text-muted-foreground hover:text-foreground",
				)}
			>
				☀ Light
			</button>
		</div>
	);
};

export default ThemeToggle;
