import React, { useEffect, useRef } from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';

const Auth: React.FC = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'signin';
  const redirect = searchParams.get('redirect') || '/';
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Neural network nodes
    const nodes: { x: number; y: number; vx: number; vy: number; connections: number[] }[] = [];
    const nodeCount = 50;
    const connectionDistance = 150;

    // Initialize nodes
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        connections: []
      });
    }

    // Animation loop
    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw nodes
      nodes.forEach((node, i) => {
        // Update position
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off walls
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        // Find connections
        node.connections = [];
        nodes.forEach((other, j) => {
          if (i !== j) {
            const dx = other.x - node.x;
            const dy = other.y - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < connectionDistance) {
              node.connections.push(j);
              
              // Draw connection
              const opacity = (1 - distance / connectionDistance) * 0.4;
              ctx.strokeStyle = `rgba(139, 92, 246, ${opacity})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(node.x, node.y);
              ctx.lineTo(other.x, other.y);
              ctx.stroke();
            }
          }
        });

        // Draw node
        ctx.fillStyle = 'rgba(139, 92, 246, 0.6)';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-8 relative">
      {/* Neural Network Background */}
      <canvas 
        ref={canvasRef}
        className="fixed inset-0 z-0"
        style={{ opacity: 0.4 }}
      />

      {/* Simple gradient overlay */}
      <div className="fixed inset-0 z-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950/10 via-transparent to-blue-950/10" />
      </div>

      {/* Auth Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-20 w-full max-w-md"
      >
        {mode === 'signup' ? (
          <SignUp
            forceRedirectUrl={redirect}
            signInForceRedirectUrl={redirect}
            appearance={{
              layout: {
                socialButtonsPlacement: 'top',
                socialButtonsVariant: 'blockButton'
              },
              variables: {
                colorPrimary: '#8b5cf6',
                colorBackground: '#000000',
                colorInputBackground: 'rgba(0,0,0,0.5)',
                colorText: '#ffffff',
                borderRadius: '0.75rem'
              },
              elements: {
                formButtonPrimary: 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-200',
                card: 'bg-black/60 backdrop-blur-2xl border border-white/10 shadow-2xl',
                headerTitle: 'text-3xl font-black text-white',
                headerSubtitle: 'text-gray-400 text-lg',
                socialButtonsBlockButton: 'bg-white/5 border-white/10 hover:bg-white/10 backdrop-blur-xl transition-all duration-200',
                socialButtonsBlockButtonText: 'text-white font-semibold',
                dividerLine: 'bg-white/10',
                dividerText: 'text-gray-500',
                formFieldLabel: 'text-gray-400 font-medium',
                formFieldInput: 'bg-black/50 border-white/20 text-white placeholder-gray-500 backdrop-blur-xl',
                formFieldInputShowPasswordButton: 'text-gray-400 hover:text-white',
                footerActionLink: 'text-purple-400 hover:text-purple-300 font-bold',
                footerActionText: 'text-gray-400',
                identityPreviewText: 'text-gray-400',
                identityPreviewEditButtonIcon: 'text-purple-400',
                formFieldAction: 'text-purple-400 hover:text-purple-300',
                formFieldHintText: 'text-gray-500',
                formResendCodeLink: 'text-purple-400 hover:text-purple-300',
                otpCodeFieldInput: 'bg-black/50 border-white/20 text-white',
                phoneInputBox: 'bg-black/50 border-white/20 text-white',
                alternativeMethodsBlockButton: 'bg-white/5 border-white/10 hover:bg-white/10 text-white',
                formFieldSuccessText: 'text-green-400',
                formFieldWarningText: 'text-yellow-400',
                formFieldErrorText: 'text-red-400',
                formHeaderTitle: 'text-2xl font-black',
                formHeaderSubtitle: 'text-gray-400',
                verificationLinkStatusIcon: 'text-purple-400',
                verificationLinkStatusText: 'text-gray-300',
                alert: 'bg-red-900/20 border-red-500/30 text-red-400',
                alertText: 'text-red-400'
              }
            }}
            signInUrl="/"
          />
        ) : (
          <SignIn
            forceRedirectUrl={redirect}
            signUpForceRedirectUrl={redirect}
            appearance={{
              layout: {
                socialButtonsPlacement: 'top',
                socialButtonsVariant: 'blockButton'
              },
              variables: {
                colorPrimary: '#8b5cf6',
                colorBackground: '#000000',
                colorInputBackground: 'rgba(0,0,0,0.5)',
                colorText: '#ffffff',
                borderRadius: '0.75rem'
              },
              elements: {
                formButtonPrimary: 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-200',
                card: 'bg-black/60 backdrop-blur-2xl border border-white/10 shadow-2xl',
                headerTitle: 'text-3xl font-black text-white',
                headerSubtitle: 'text-gray-400 text-lg',
                socialButtonsBlockButton: 'bg-white/5 border-white/10 hover:bg-white/10 backdrop-blur-xl transition-all duration-200',
                socialButtonsBlockButtonText: 'text-white font-semibold',
                dividerLine: 'bg-white/10',
                dividerText: 'text-gray-500',
                formFieldLabel: 'text-gray-400 font-medium',
                formFieldInput: 'bg-black/50 border-white/20 text-white placeholder-gray-500 backdrop-blur-xl',
                formFieldInputShowPasswordButton: 'text-gray-400 hover:text-white',
                footerActionLink: 'text-purple-400 hover:text-purple-300 font-bold',
                footerActionText: 'text-gray-400',
                identityPreviewText: 'text-gray-400',
                identityPreviewEditButtonIcon: 'text-purple-400',
                formFieldAction: 'text-purple-400 hover:text-purple-300',
                formFieldHintText: 'text-gray-500',
                formResendCodeLink: 'text-purple-400 hover:text-purple-300',
                otpCodeFieldInput: 'bg-black/50 border-white/20 text-white',
                phoneInputBox: 'bg-black/50 border-white/20 text-white',
                alternativeMethodsBlockButton: 'bg-white/5 border-white/10 hover:bg-white/10 text-white',
                formHeaderTitle: 'text-2xl font-black',
                formHeaderSubtitle: 'text-gray-400',
                verificationLinkStatusIcon: 'text-purple-400',
                verificationLinkStatusText: 'text-gray-300',
                alert: 'bg-red-900/20 border-red-500/30 text-red-400',
                alertText: 'text-red-400'
              }
            }}
            signUpUrl="/?mode=signup"
          />
        )}
      </motion.div>
    </div>
  );
};

export default Auth;