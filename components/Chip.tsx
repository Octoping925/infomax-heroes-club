const TEXT_SIZE_CLASSES = {
  "3xs": "text-[10px]",
  "2xs": "text-[11px]",
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
} as const;

interface ChipProps {
  readonly children: React.ReactNode;
  readonly bold?: boolean;
  readonly textSize?: keyof typeof TEXT_SIZE_CLASSES;
  readonly className?: string;
}

export function Chip({
  children,
  bold = false,
  textSize = "sm",
  className = "",
}: ChipProps) {
  return (
    <span
      className={`px-2 py-0.5 rounded ${TEXT_SIZE_CLASSES[textSize]} ${bold ? "font-bold" : ""} ${className}`}
    >
      {children}
    </span>
  );
}
