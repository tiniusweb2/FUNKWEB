import * as THREE from 'three';

export class TunnelAnimation {
    constructor(containerElement, options = {}) {
        // Enhanced default configuration
        this.config = {
            radius: 10,
            segments: 72,    // Radial segments
            rings: 60,       // Longitudinal rings
            length: 50,      // Tunnel length
            speed: 0.03,     // Animation speed
            lineWidth: 1.5,  // Line thickness
            baseOpacity: 0.5,// Base opacity of lines
            color: 0x000000, // Line color
            bufferSize: 2,   // Number of tunnel sections to buffer
            segmentDetail: 256 // Detail level for circle segments
        };

        Object.assign(this.config, options);

        // Setup scene with fog for smooth distance fading
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xffffff);
        this.scene.fog = new THREE.Fog(0xffffff, 1, this.config.length * 0.8);

        // Enhanced camera setup with optimized near/far planes
        this.camera = new THREE.PerspectiveCamera(
            75,
            containerElement.clientWidth / containerElement.clientHeight,
            0.1,
            this.config.length * 1.5
        );
        this.camera.position.z = 20;

        // Enhanced renderer setup
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            stencil: false, // Disable unused features
            depth: true
        });
        
        // Set pixel ratio with a maximum to prevent performance issues
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(containerElement.clientWidth, containerElement.clientHeight);
        containerElement.appendChild(this.renderer.domElement);

        // Create tunnel sections for smooth scrolling
        this.tunnelSections = [];
        for (let i = 0; i < this.config.bufferSize; i++) {
            const section = this.createTunnelSection();
            section.position.z = i * (this.config.length / this.config.bufferSize);
            this.tunnelSections.push(section);
            this.scene.add(section);
        }

        // Enhanced animation properties
        this.isAnimating = false;
        this.clock = new THREE.Clock();
        this.deltaTime = 0;
        this.lastTime = 0;

        // Bind methods
        this.animate = this.animate.bind(this);
        this.handleResize = this.handleResize.bind(this);

        // Add resize listener with debouncing
        this.resizeTimeout = null;
        window.addEventListener('resize', () => {
            if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(this.handleResize, 100);
        });
    }

    createTunnelSection() {
        const group = new THREE.Group();
        const { radius, segments, rings, length, color, baseOpacity, segmentDetail } = this.config;

        // Create optimized geometry for rings
        const ringGeometry = new THREE.BufferGeometry();
        const ringVertices = [];
        
        for (let i = 0; i <= segmentDetail; i++) {
            const theta = (i / segmentDetail) * Math.PI * 2;
            ringVertices.push(
                Math.cos(theta) * radius,
                Math.sin(theta) * radius,
                0
            );
        }
        
        ringGeometry.setAttribute('position', 
            new THREE.Float32BufferAttribute(ringVertices, 3));

        // Create rings with instancing for better performance
        const ringMaterial = new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity: baseOpacity,
            linewidth: this.config.lineWidth
        });

        for (let i = 0; i <= rings; i++) {
            const ring = new THREE.Line(ringGeometry, ringMaterial);
            ring.position.z = (i / rings) * length - length/2;
            group.add(ring);
        }

        // Create optimized longitudinal lines
        const lineGeometry = new THREE.BufferGeometry();
        const lineVertices = [];
        const steps = 200; // Reduced step count for better performance

        for (let i = 0; i < segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            for (let j = 0; j <= steps; j++) {
                const z = (j / steps) * length - length/2;
                lineVertices.push(
                    Math.cos(theta) * radius,
                    Math.sin(theta) * radius,
                    z
                );
            }
        }

        lineGeometry.setAttribute('position', 
            new THREE.Float32BufferAttribute(lineVertices, 3));

        const lineMaterial = new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity: baseOpacity,
            linewidth: this.config.lineWidth
        });

        const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
        group.add(lines);

        return group;
    }

    animate(currentTime) {
        if (!this.isAnimating) return;
        requestAnimationFrame(this.animate);

        // Use clock for precise timing
        this.deltaTime = this.clock.getDelta();
        
        // Update tunnel sections
        const sectionLength = this.config.length / this.config.bufferSize;
        
        this.tunnelSections.forEach((section, index) => {
            section.position.z += this.config.speed;
            
            // Reset section position when it moves too far
            if (section.position.z > sectionLength) {
                section.position.z = -sectionLength * (this.config.bufferSize - 1);
            }
            
            // Update opacity smoothly
            section.children.forEach(child => {
                const distanceFromCamera = Math.abs(child.position.z + section.position.z);
                const opacity = Math.max(0.2, Math.min(0.7, 
                    1 - Math.pow(distanceFromCamera / (this.config.length * 0.7), 1.5)
                ));
                child.material.opacity = opacity;
            });
        });

        this.renderer.render(this.scene, this.camera);
    }

    handleResize() {
        const container = this.renderer.domElement.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    start() {
        if (!this.isAnimating) {
            this.isAnimating = true;
            this.clock.start();
            this.animate(0);
        }
    }

    stop() {
        this.isAnimating = false;
        this.clock.stop();
    }

    dispose() {
        this.stop();
        window.removeEventListener('resize', this.handleResize);
        this.tunnelSections.forEach(section => {
            this.scene.remove(section);
            section.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) object.material.dispose();
            });
        });
        this.renderer.dispose();
    }
}