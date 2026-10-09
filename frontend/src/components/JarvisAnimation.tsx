import React, { useEffect, useRef } from 'react';

interface JarvisAnimationProps {
  energy?: number; // 0.0 (idle) to 1.0 (active/thinking)
  className?: string;
  size?: number;
}

export const JarvisAnimation: React.FC<JarvisAnimationProps> = ({
  energy = 0.25,
  className = '',
  size,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetEnergyRef = useRef<number>(energy);

  useEffect(() => {
    targetEnergyRef.current = Math.max(0, Math.min(1, energy));
  }, [energy]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Check if THREE is available globally
    const THREE = (window as any).THREE;
    if (!THREE) {
      console.warn('Three.js not loaded yet for Jarvis animation');
      return;
    }

    let animationFrameId: number;
    let renderer: any;
    let isDisposed = false;

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true, // Transparent canvas so background glows through
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.z = 6;

      const root = new THREE.Group();
      scene.add(root);

      const U = {
        uTime: { value: 0 },
        uEnergy: { value: 0.25 },
      };
      const ADD = THREE.AdditiveBlending;

      // Threads: bundles of fine continuous strands that wave and twist together
      const threadMat = new THREE.ShaderMaterial({
        uniforms: U,
        transparent: true,
        depthWrite: false,
        blending: ADD,
        vertexShader: `
          attribute float aAngle;attribute float aRing;attribute float aRad;attribute vec3 aOff;
          uniform float uTime,uEnergy;varying float vA;varying float vH;
          void main(){
            float t=uTime,th=aAngle,k=aRing;
            float w=sin(th*2.0+t*.5+k*1.7)*.09+sin(th*3.0-t*.35+k*2.9)*.06
                   +sin(th*5.0+t*.8+k)*.03*(.5+uEnergy)+sin(th*9.0-t*1.1+k)*.012*uEnergy;
            float tw=sin(th*3.0+t*.7+aOff.y*6.2832)*.5+.5;
            float r=aRad*(1.0+w)+aOff.x*.05*(.5+tw)*(1.0+uEnergy);
            vec3 p=vec3(cos(th)*r,sin(th)*r,0.0);
            p.z=sin(th*3.0+t*.6+k*2.0)*.2*aRad+aOff.z*.06*(.5+tw)+sin(th*2.0-t*.4)*.12;
            gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
            float pulse=pow(max(0.0,sin(th*2.0-t*(1.2+uEnergy*2.0)+aOff.y*6.2832+k)),18.0);
            vA=.07+.09*(1.0-abs(aOff.x))+pulse*(.55+uEnergy*.45);
            vH=pulse;
          }`,
        fragmentShader: `
          varying float vA;varying float vH;
          void main(){gl_FragColor=vec4(mix(vec3(.16,.80,.70),vec3(.85,1.0,.96),vH),vA);}`,
      });

      const SEG = 240;
      const bundles = [
        [1.9, 38],
        [1.72, 38],
        [1.54, 30],
        [1.36, 24],
        [1.18, 18],
      ];
      const threads: any[] = [];

      bundles.forEach(([R, count], ri) => {
        const V = count * SEG * 2;
        const ang = new Float32Array(V);
        const rn = new Float32Array(V);
        const rad = new Float32Array(V);
        const off = new Float32Array(V * 3);
        const pos = new Float32Array(V * 3);
        let n = 0;
        for (let j = 0; j < count; j++) {
          const ox = Math.random() * 2 - 1;
          const oy = Math.random();
          const oz = Math.random() * 2 - 1;
          for (let s = 0; s < SEG; s++) {
            for (let e = 0; e < 2; e++) {
              ang[n] = ((s + e) / SEG) * Math.PI * 2;
              rn[n] = ri;
              rad[n] = R;
              off[n * 3] = ox;
              off[n * 3 + 1] = oy;
              off[n * 3 + 2] = oz;
              n++;
            }
          }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('aAngle', new THREE.BufferAttribute(ang, 1));
        g.setAttribute('aRing', new THREE.BufferAttribute(rn, 1));
        g.setAttribute('aRad', new THREE.BufferAttribute(rad, 1));
        g.setAttribute('aOff', new THREE.BufferAttribute(off, 3));
        const l = new THREE.LineSegments(g, threadMat);
        l.frustumCulled = false;
        l.rotation.x = (ri - 2) * 0.03;
        root.add(l);
        threads.push(l);
      });

      // Core: counter-rotating wireframes
      const lineMat = (o: number) =>
        new THREE.LineBasicMaterial({
          color: 0x3fe8d0,
          transparent: true,
          opacity: o,
          blending: ADD,
          depthWrite: false,
        });

      const core = new THREE.Group();
      root.add(core);

      const wireOuter = new THREE.LineSegments(
        new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.62, 2)),
        lineMat(0.3)
      );
      const wireInner = new THREE.LineSegments(
        new THREE.WireframeGeometry(new THREE.OctahedronGeometry(0.32, 1)),
        lineMat(0.55)
      );
      const vpts = new THREE.Points(
        new THREE.IcosahedronGeometry(0.62, 2),
        new THREE.PointsMaterial({
          color: 0x9fffee,
          size: 0.02,
          transparent: true,
          opacity: 0.9,
          blending: ADD,
          depthWrite: false,
        })
      );
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 24, 24),
        new THREE.MeshBasicMaterial({
          color: 0x3fe8d0,
          transparent: true,
          opacity: 0.07,
          blending: ADD,
          depthWrite: false,
        })
      );

      core.add(wireOuter, vpts, glow);
      const coreIn = new THREE.Group();
      coreIn.add(wireInner);
      root.add(coreIn);

      const handleResize = () => {
        if (!container || !renderer || isDisposed) return;
        const rect = container.getBoundingClientRect();
        const w = rect.width || 300;
        const h = rect.height || 300;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        // Scale to fill canvas with balanced margins (~85% fill)
        root.scale.setScalar((1.05 * Math.min(4.97, 4.97 * camera.aspect)) / 4.4);
      };

      handleResize();

      let mx = 0;
      let my = 0;
      const handlePointerMove = (e: MouseEvent) => {
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        mx = (e.clientX - cx) / window.innerWidth;
        my = (e.clientY - cy) / window.innerHeight;
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('resize', handleResize);

      const resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(container);

      let currentEnergy = targetEnergyRef.current;
      let lastTime = performance.now();
      let T = 0;

      const frame = (now: number) => {
        if (isDisposed) return;
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        T += dt;

        currentEnergy += (targetEnergyRef.current - currentEnergy) * Math.min(dt * 3, 1);
        U.uTime.value = T;
        U.uEnergy.value = currentEnergy;

        core.scale.setScalar(1 + Math.sin(T * (2 + currentEnergy * 4)) * 0.04 * (0.4 + currentEnergy));
        core.rotation.y = T * 0.25;
        core.rotation.x = T * 0.12;
        coreIn.rotation.y = -T * 0.5;
        coreIn.rotation.z = T * 0.3;

        glow.material.opacity = 0.06 + currentEnergy * 0.12;
        wireOuter.material.opacity = 0.24 + currentEnergy * 0.3;

        threads.forEach((l, i) => {
          l.rotation.z = T * (0.025 + i * 0.01) * (i % 2 ? -1 : 1) * (1 + currentEnergy);
        });

        root.rotation.y += (mx * 0.5 - root.rotation.y) * 0.04;
        root.rotation.x += (0.3 + my * 0.3 - root.rotation.x) * 0.04;

        renderer.render(scene, camera);
        animationFrameId = requestAnimationFrame(frame);
      };

      animationFrameId = requestAnimationFrame(frame);

      return () => {
        isDisposed = true;
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('resize', handleResize);
        resizeObserver.disconnect();
        try {
          renderer.dispose();
        } catch {
          // ignore
        }
      };
    } catch (err) {
      console.error('Failed to initialize Jarvis animation:', err);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center pointer-events-none select-none transition-all duration-500 ${className}`}
      style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="w-full h-full block filter drop-shadow-[0_0_24px_rgba(34,211,238,0.35)]"
      />
    </div>
  );
};

export const DonnaAnimation = JarvisAnimation;
