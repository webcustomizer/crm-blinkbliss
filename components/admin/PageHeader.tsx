type PageHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export default function PageHeader({
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-[#D4AF37]">{title}</h1>
        {description && <p className="mt-1 text-gray-400">{description}</p>}
      </div>

      {action}
    </div>
  );
}
