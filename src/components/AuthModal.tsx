import { useState } from "react";
import { X, LogIn } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: string; // e.g., "add to favorites", "view comments"
}

export function AuthModal({ isOpen, onClose, action }: AuthModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl p-6 m-4 max-w-sm w-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <X size={18} />
        </button>

        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <LogIn size={24} className="text-primary" />
          </div>
          
          <h2 className="text-lg font-semibold mb-2">Sign in required</h2>
          <p className="text-sm text-muted-foreground mb-6">
            You need to sign in to {action}
          </p>

          <div className="space-y-3">
            <Link href="/login" className="block">
              <Button className="w-full">
                Sign In
              </Button>
            </Link>
            <Link href="/signup" className="block">
              <Button variant="outline" className="w-full">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to manage auth modal state
export function useAuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [action, setAction] = useState("");

  const openModal = (actionText: string) => {
    setAction(actionText);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setAction("");
  };

  return { isOpen, action, openModal, closeModal };
}
