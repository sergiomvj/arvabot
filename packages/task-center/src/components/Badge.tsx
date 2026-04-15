import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive/10 text-destructive",
        outline: "border-border text-foreground",
        backlog: "bg-zinc-800 text-zinc-300 border-zinc-700",
        assigned: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        in_progress: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        blocked: "bg-red-500/10 text-red-400 border-red-500/20",
        completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export type BadgeVariantProps = VariantProps<typeof badgeVariants>;

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, BadgeVariantProps {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
