import { Toaster as SonnerToaster } from "sonner"

export const Toaster = () => {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      theme="system"
      toastOptions={{
        className: "rounded-xl border shadow-lg font-sans",
      }}
    />
  )
}
