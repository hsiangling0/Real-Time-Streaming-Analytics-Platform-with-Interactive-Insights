import { LoginForm } from "@/components/login/form";
import preview from "../assets/preview.jpg";

export default function Login() {
  return (
    <div className="relative min-h-screen w-full">
      
      {/* Background Image */}
      <img
        src={preview}
        alt="Login background"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Centered login form */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="rounded-xl bg-white/90 backdrop-blur p-6 shadow-xl">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}