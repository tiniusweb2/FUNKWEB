import './style.css'
import { TunnelAnimation } from './TunnelAnimation'

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    // Get the container
    const container = document.getElementById('tunnel-container');
    
    // Create tunnel with custom options if desired
    const tunnel = new TunnelAnimation(container, {
        radius: 10,
        segments: 72,
        rings: 60,
        length: 50,
        speed: 0.03,
        color: 0x000000
    });
    
    // Start the animation
    tunnel.start();
});