import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-brand text-surface shadow-sm hover:bg-brand-hover",
        destructive: "bg-red-600 text-white shadow-sm hover:bg-red-700",
        outline: "border border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-strong",
        secondary: "bg-surface-strong text-ink shadow-sm hover:bg-page-muted",
        ghost: "text-ink hover:bg-surface-strong",
        link: "text-brand underline-offset-4 hover:underline",
        onGradient: "bg-surface text-brand shadow-md hover:bg-surface-strong",
        outlineOnGradient: "border border-surface/70 bg-transparent text-surface hover:bg-surface/15 hover:text-surface",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
