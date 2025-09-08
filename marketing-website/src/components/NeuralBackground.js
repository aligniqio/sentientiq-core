import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
const NeuralBackground = () => {
    const canvasRef = useRef(null);
    const animationRef = useRef();
    const nodesRef = useRef([]);
    const connectionsRef = useRef([]);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        // Initialize nodes with depth
        const nodeCount = 150; // More nodes for richness
        const nodes = [];
        for (let i = 0; i < nodeCount; i++) {
            nodes.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                z: Math.random() * 1000, // Depth from 0 to 1000
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                vz: (Math.random() - 0.5) * 0.2,
                radius: Math.random() * 1.5 + 0.5,
                pulsePhase: Math.random() * Math.PI * 2
            });
        }
        nodesRef.current = nodes;
        // Mouse interaction
        let mouseX = canvas.width / 2;
        let mouseY = canvas.height / 2;
        const handleMouseMove = (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        };
        window.addEventListener('mousemove', handleMouseMove);
        // Animation loop
        const animate = (time) => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; // Subtle trail effect
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Update connections
            const connections = [];
            // Update and draw nodes
            nodesRef.current.forEach((node, i) => {
                // Update position
                node.x += node.vx;
                node.y += node.vy;
                node.z += node.vz;
                // Bounce off walls
                if (node.x < 0 || node.x > canvas.width)
                    node.vx *= -1;
                if (node.y < 0 || node.y > canvas.height)
                    node.vy *= -1;
                if (node.z < 0 || node.z > 1000)
                    node.vz *= -1;
                // Keep in bounds
                node.x = Math.max(0, Math.min(canvas.width, node.x));
                node.y = Math.max(0, Math.min(canvas.height, node.y));
                node.z = Math.max(0, Math.min(1000, node.z));
                // Mouse influence (subtle)
                const dx = mouseX - node.x;
                const dy = mouseY - node.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 200) {
                    const force = (200 - distance) / 200 * 0.02;
                    node.vx += (dx / distance) * force;
                    node.vy += (dy / distance) * force;
                }
                // Speed limit
                const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
                if (speed > 0.5) {
                    node.vx = (node.vx / speed) * 0.5;
                    node.vy = (node.vy / speed) * 0.5;
                }
                // Update pulse phase
                node.pulsePhase += 0.02;
                // Find connections
                nodesRef.current.forEach((other, j) => {
                    if (i < j) { // Only check each pair once
                        const dx = other.x - node.x;
                        const dy = other.y - node.y;
                        const dz = other.z - node.z;
                        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz / 100);
                        // Depth-adjusted connection distance
                        const maxDistance = 150 - Math.abs(node.z - other.z) / 20;
                        if (distance < maxDistance) {
                            connections.push({
                                from: i,
                                to: j,
                                strength: 1 - distance / maxDistance
                            });
                        }
                    }
                });
            });
            connectionsRef.current = connections;
            // Draw connections
            connectionsRef.current.forEach(conn => {
                const nodeA = nodesRef.current[conn.from];
                const nodeB = nodesRef.current[conn.to];
                // Calculate depth-based opacity
                const avgDepth = (nodeA.z + nodeB.z) / 2;
                const depthOpacity = 1 - (avgDepth / 1000) * 0.7; // Farther = dimmer
                ctx.beginPath();
                ctx.moveTo(nodeA.x, nodeA.y);
                ctx.lineTo(nodeB.x, nodeB.y);
                // Create gradient for connection
                const gradient = ctx.createLinearGradient(nodeA.x, nodeA.y, nodeB.x, nodeB.y);
                const pulse = Math.sin(time * 0.001 + nodeA.pulsePhase) * 0.3 + 0.7;
                gradient.addColorStop(0, `rgba(59, 130, 246, ${conn.strength * 0.3 * depthOpacity * pulse})`);
                gradient.addColorStop(0.5, `rgba(168, 85, 247, ${conn.strength * 0.2 * depthOpacity * pulse})`);
                gradient.addColorStop(1, `rgba(236, 72, 153, ${conn.strength * 0.3 * depthOpacity * pulse})`);
                ctx.strokeStyle = gradient;
                ctx.lineWidth = conn.strength * 2 * depthOpacity;
                ctx.stroke();
            });
            // Draw nodes
            nodesRef.current.forEach(node => {
                const depthScale = 1 - (node.z / 1000) * 0.6; // Farther = smaller
                const depthOpacity = 1 - (node.z / 1000) * 0.5; // Farther = dimmer
                const pulse = Math.sin(time * 0.001 + node.pulsePhase) * 0.3 + 0.7;
                // Node glow
                const glowRadius = node.radius * 4 * depthScale;
                const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowRadius);
                glow.addColorStop(0, `rgba(59, 130, 246, ${0.3 * depthOpacity * pulse})`);
                glow.addColorStop(0.5, `rgba(168, 85, 247, ${0.1 * depthOpacity * pulse})`);
                glow.addColorStop(1, 'rgba(168, 85, 247, 0)');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
                ctx.fill();
                // Node core
                ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * depthOpacity * pulse})`;
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius * depthScale, 0, Math.PI * 2);
                ctx.fill();
            });
            animationRef.current = requestAnimationFrame(animate);
        };
        animate(0);
        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', handleMouseMove);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);
    return (_jsxs(_Fragment, { children: [_jsx("canvas", { ref: canvasRef, className: "fixed inset-0 w-full h-full", style: {
                    zIndex: 0,
                    background: 'radial-gradient(ellipse at center, #000814 0%, #000000 100%)'
                } }), _jsxs("div", { className: "fixed inset-0 pointer-events-none", style: { zIndex: 1 }, children: [_jsx("div", { className: "absolute inset-0 opacity-20", style: {
                            background: 'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)',
                            animation: 'pulse-slow 8s ease-in-out infinite'
                        } }), _jsx("div", { className: "absolute inset-0 opacity-20", style: {
                            background: 'radial-gradient(circle at 80% 50%, rgba(168, 85, 247, 0.3) 0%, transparent 50%)',
                            animation: 'pulse-slow 10s ease-in-out infinite reverse'
                        } }), _jsx("div", { className: "absolute inset-0 opacity-15", style: {
                            background: 'radial-gradient(circle at 50% 80%, rgba(236, 72, 153, 0.3) 0%, transparent 50%)',
                            animation: 'pulse-slow 12s ease-in-out infinite'
                        } }), _jsx("div", { className: "absolute inset-0 opacity-10", style: {
                            background: 'radial-gradient(circle at 50% 20%, rgba(6, 182, 212, 0.2) 0%, transparent 50%)',
                            animation: 'pulse-slow 15s ease-in-out infinite reverse'
                        } })] }), _jsx("div", { className: "fixed inset-0 pointer-events-none", style: {
                    zIndex: 2,
                    background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.4) 100%)'
                } })] }));
};
export default NeuralBackground;
