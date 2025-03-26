import React, { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// 집 모델 컴포넌트
const HouseModel = ({ position = [0, -3, -5], scale = 0.5, rotation = [0, 0, 0], ...props }) => {
  const group = useRef();
  const { nodes, materials } = useGLTF('/models/model2.glb');

  // 모델 로드 완료 후 처리
  useEffect(() => {
    if (group.current) {
      console.log("집 모델 로드 완료");

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
  }, []);

  return (
    <group ref={group} {...props} position={position} scale={scale} rotation={rotation}>
      <primitive object={nodes.Scene || nodes.scene || Object.values(nodes)[0]} />
    </group>
  );
};

export default HouseModel;

// 모델 프리로딩
useGLTF.preload('/models/model2.glb');