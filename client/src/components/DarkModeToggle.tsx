import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface DarkModeToggleProps {
  isDark: boolean;
  toggleDarkMode: () => void;
}

export function DarkModeToggle({
  isDark,
  toggleDarkMode,
}: DarkModeToggleProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      const scrollPercent = (scrollTop / docHeight) * 100;

      // Shfaqet në 2% dhe fshihet në 6%
      setShow(scrollPercent >= 2 && scrollPercent <= 6);
    };

    handleScroll(); // Check initial state
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleDarkMode}
      aria-label="Toggle dark mode"
      className={`fixed top-4 right-6 z-50
        h-11 w-11
        rounded-full
        bg-white/90 dark:bg-stone-800/90
        backdrop-blur-2xl
        shadow-[0_8px_30px_rgba(0,0,0,0.15)]
        border border-stone-200 dark:border-stone-700/50
        transition-all duration-300 ease-out
        hover:scale-110 hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)]
        ${
          show
            ? "opacity-100 scale-100"
            : "opacity-0 scale-75 pointer-events-none"
        }
      `}
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-yellow-500 transition-transform duration-300" />
      ) : (
        <Moon className="h-5 w-5 text-stone-700 dark:text-stone-300 transition-transform duration-300" />
      )}
    </Button>
  );
}
