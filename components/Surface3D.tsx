
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface Surface3DProps {
  heightMap: number[][];
  ra: number;
  reflectivity: number;
}

const Surface3D: React.FC<Surface3DProps> = ({ heightMap, ra, reflectivity }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(40, 40, 40);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
    directionalLight.position.set(15, 30, 15);
    scene.add(directionalLight);

    const size = heightMap.length || 50;
    const geometry = new THREE.PlaneGeometry(50, 50, size - 1, size - 1);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setScalar(0.2 + reflectivity * 0.7),
      metalness: 0.9,
      roughness: Math.min(0.9, ra * 1.5),
      flatShading: false,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (!meshRef.current || !heightMap.length) return;

    const mesh = meshRef.current;
    const geometry = mesh.geometry as THREE.PlaneGeometry;
    const position = geometry.attributes.position;
    const size = heightMap.length;
    
    const scale = ra < 0.001 ? 1000000 : ra < 0.1 ? 10000 : 50;

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const idx = i * size + j;
        position.setY(idx, heightMap[i][j] * scale);
      }
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    if (mesh.material instanceof THREE.MeshStandardMaterial) {
      mesh.material.roughness = Math.min(0.95, 0.05 + ra * 0.8);
      mesh.material.color.setScalar(0.2 + reflectivity * 0.75);
    }
  }, [heightMap, ra, reflectivity]);

  return <div ref={containerRef} className="w-full h-full cursor-move" />;
};

export default Surface3D;
