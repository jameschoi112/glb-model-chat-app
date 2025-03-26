import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const SecondCharacterModel = ({ modelPath = '/models/model5.glb', position = [1.5, -0.87, 0], scale = 1, rotation = [0, 0, 0], ...props }) => {
  const group = useRef();
  const { nodes, materials, animations } = useGLTF(modelPath);
  const [mixer] = useState(() => new THREE.AnimationMixer());

  // 모델이 변경될 때마다 새로운 설정 적용
  useEffect(() => {
    if (group.current) {
      // 그림자 설정
      group.current.traverse((object) => {
        if (object.isMesh) {
          object.castShadow = true;
          object.receiveShadow = true;

          // 머티리얼 개선 (필요 시)
          if (object.material) {
            // 메탈릭/러프니스 워크플로우로 변환
            if (!object.material.roughness) {
              object.material.roughness = 0.8;
              object.material.metalness = 0.2;
            }
          }
        }
      });
    }

    // 애니메이션 설정
    if (animations && animations.length && mixer) {
      // 첫 번째 애니메이션 적용
      const action = mixer.clipAction(animations[0], group.current);
      action.play();

      // 애니메이션 설정 - 루프 및 페이드 시간 조정
      action.loop = THREE.LoopRepeat;
      action.clampWhenFinished = false;
      action.timeScale = 0.8; // 약간 느리게 재생
    }
  }, [animations, mixer, modelPath]);

  // 자연스러운 움직임을 위한 애니메이션 업데이트
  useEffect(() => {
    const clock = new THREE.Clock();

    const animate = () => {
      const delta = clock.getDelta();
      if (mixer) mixer.update(delta);
      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [mixer]);

  return (
    <group ref={group} position={position} scale={scale} rotation={rotation} {...props}>
      <primitive object={nodes.Scene || nodes.scene || Object.values(nodes)[0]} />
    </group>
  );
};

export default SecondCharacterModel;

// 모델 프리로딩
useGLTF.preload('/models/model5.glb');