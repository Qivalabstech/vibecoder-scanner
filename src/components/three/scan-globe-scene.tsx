"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

function Globe() {
  const group = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const { pointer } = useThree();

  const wireGeometry = useMemo(() => new THREE.IcosahedronGeometry(1.6, 3), []);

  useFrame((state, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.12;
      // subtle cursor-reactive parallax
      const targetX = pointer.y * 0.15;
      const targetY = pointer.x * 0.25;
      group.current.rotation.x += (targetX - group.current.rotation.x) * 0.04;
      group.current.rotation.z += (targetY * 0.3 - group.current.rotation.z) * 0.04;
    }
    if (pulseRef.current) {
      const t = (state.clock.elapsedTime % 3) / 3;
      const scale = 1.6 + t * 1.4;
      pulseRef.current.scale.setScalar(scale);
      const material = pulseRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = Math.max(0, 0.5 - t * 0.5);
    }
  });

  return (
    <group ref={group}>
      <mesh geometry={wireGeometry}>
        <meshBasicMaterial color="#a78bfa" wireframe transparent opacity={0.55} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[1.58, 1]} />
        <meshBasicMaterial color="#c4b5fd" wireframe transparent opacity={0.15} />
      </mesh>
      {/* scan pulse ring */}
      <mesh ref={pulseRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.98, 1, 64]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export default function ScanGlobeScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.6], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.6} />
      <Globe />
    </Canvas>
  );
}
