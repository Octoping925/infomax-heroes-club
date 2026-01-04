interface TitleProps {
  readonly title: string;
  readonly description?: string;
}

export function Title({ title, description }: TitleProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <h3 className="text-md font-semibold text-white uppercase tracking-wider">
        {title}
      </h3>
      {description && <p className="text-xs text-gray-500">{description}</p>}
    </div>
  );
}
