"use client";

import { Toaster } from "sonner";

type ToasterProps = React.ComponentProps<typeof Toaster>;

const Sonner = ({ ...props }: ToasterProps) => {
  return <Toaster className="toaster group" {...props} />;
};

export { Sonner as Toaster };
