import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        background:
          "radial-gradient(ellipse at 70% 20%, hsl(217 80% 20% / 0.7), transparent 60%), radial-gradient(ellipse at 20% 80%, hsl(217 70% 15% / 0.6), transparent 60%), hsl(220 20% 4%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-8xl font-extrabold font-heading text-primary/20 mb-2">404</p>
        <h1 className="text-2xl font-bold font-heading text-white mb-2">Siden blev ikke fundet</h1>
        <p className="text-sm text-white/40 mb-8 max-w-sm mx-auto">
          Den side du leder efter eksisterer ikke eller er blevet flyttet.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button asChild variant="outline" className="rounded-xl border-white/10 text-white/60 hover:bg-white/5 hover:text-white">
            <Link to="/" className="gap-2"><Home size={15} /> Gå til dashboard</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
