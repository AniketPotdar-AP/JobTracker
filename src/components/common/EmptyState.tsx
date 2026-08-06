import { ElementType, ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({
  icon: IconProp,
  title,
  description,
  action,
}: {
  icon?: ReactNode | ElementType;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const renderIcon = () => {
    if (!IconProp) return <Inbox className="h-5 w-5" />;
    if (
      typeof IconProp === "function" ||
      (typeof IconProp === "object" && IconProp !== null && "$$typeof" in IconProp && "render" in IconProp)
    ) {
      const Component = IconProp as ElementType;
      return <Component className="h-5 w-5" />;
    }
    return IconProp as ReactNode;
  };

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 px-6 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
        {renderIcon()}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
