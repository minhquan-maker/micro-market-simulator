interface Props {
  children: string;
  className?: string;
}

export default function TextRollButton({ children, className = "" }: Props) {
  return (
    <span className={`relative overflow-hidden h-5 ${className}`}>
      <span className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
        <span>{children}</span>
        <span>{children}</span>
      </span>
    </span>
  );
}
