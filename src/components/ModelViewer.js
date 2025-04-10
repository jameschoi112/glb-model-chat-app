import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, Stars, Sky } from '@react-three/drei';
import * as THREE from 'three';
import '../styles/ModelViewer.css';

// 밤하늘 별 컴포넌트
const NightStars = () => {
  return (
    <Stars
      radius={100}
      depth={50}
      count={5000}
      factor={4}
      saturation={0}
      fade
      speed={1}
    />
  );
};

// 동적 하늘 컴포넌트
const DynamicSky = ({ background }) => {
  // 배경 설정에 따라 다른 Sky 컴포넌트 속성 반환
  const getSkyProps = () => {
    switch (background) {
      case 'sunset':
        return {
          distance: 45000,
          sunPosition: [1, 0.1, 0],
          inclination: 0.48,
          azimuth: 0.25,
          turbidity: 10,
          rayleigh: 1,
          mieCoefficient: 0.005,
          mieDirectionalG: 0.9,
        };
      case 'night':
        return {
          distance: 45000,
          sunPosition: [0, -1, 0],
          inclination: 0.1,
          azimuth: 0.3,
          turbidity: 8,
          rayleigh: 0.5,
          mieCoefficient: 0.005,
          mieDirectionalG: 0.8,
        };
      case 'dawn':
        return {
          distance: 45000,
          sunPosition: [0.3, 0.05, 0.5],
          inclination: 0.3,
          azimuth: 0.15,
          turbidity: 4,
          rayleigh: 2,
          mieCoefficient: 0.004,
          mieDirectionalG: 0.7,
        };
      default: // 'default'
        return {
          distance: 45000,
          sunPosition: [0, 1, 0],
          inclination: 0.6,
          azimuth: 0.25,
          turbidity: 5,
          rayleigh: 0.5,
          mieCoefficient: 0.005,
          mieDirectionalG: 0.8,
        };
    }
  };

  const skyProps = getSkyProps();

  return (
    <>
      <Sky {...skyProps} />
      {background === 'night' && <NightStars />}
    </>
  );
};

// 동적 조명 컴포넌트
const DynamicLighting = ({ background }) => {
  // 배경에 따라 조명 설정
  const getLightingProps = () => {
    switch (background) {
      case 'sunset':
        return {
          directionalLight: {
            position: [2, 3, 3],
            intensity: 1.2,
            color: '#ff7e57',
          },
          ambientLight: {
            intensity: 0.5,
            color: '#ffd4b8',
          },
          pointLight: {
            intensity: 0.6,
            color: '#ff9e7a',
          }
        };
      case 'night':
        return {
          directionalLight: {
            position: [2, 8, 3],
            intensity: 0.1,
            color: '#4060ff',
          },
          ambientLight: {
            intensity: 0.2,
            color: '#101040',
          },
          pointLight: {
            intensity: 0.5,
            color: '#8080ff',
          }
        };
      case 'dawn':
        return {
          directionalLight: {
            position: [2, 5, 3],
            intensity: 0.8,
            color: '#ffc0ab',
          },
          ambientLight: {
            intensity: 0.4,
            color: '#ffe8d9',
          },
          pointLight: {
            intensity: 0.4,
            color: '#ffb196',
          }
        };
      default: // 'default'
        return {
          directionalLight: {
            position: [2, 8, 3],
            intensity: 1.0,
            color: '#ffffff',
          },
          ambientLight: {
            intensity: 0.5,
            color: '#ffffff',
          },
          pointLight: {
            intensity: 0.3,
            color: '#ffffff',
          }
        };
    }
  };

  const lights = getLightingProps();

  return (
    <>
      {/* 메인 디렉셔널 라이트 */}
      <directionalLight
        position={lights.directionalLight.position}
        intensity={lights.directionalLight.intensity}
        color={lights.directionalLight.color}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
        shadow-normalBias={0.02}
      />

      {/* 앰비언트 라이트 */}
      <ambientLight intensity={lights.ambientLight.intensity} color={lights.ambientLight.color} />

      {/* 포인트 라이트 - 얼굴 부분을 밝게 */}
      <pointLight
        position={[0, 1.8, 2]}
        intensity={lights.pointLight.intensity}
        color={lights.pointLight.color}
      />
    </>
  );
};

// 환경 효과 컴포넌트
const EnvironmentEffects = ({ background }) => {
  // 배경에 따른 환경 프리셋 선택
  const getEnvironmentPreset = () => {
    switch(background) {
      case 'sunset':
        return 'sunset';
      case 'night':
        return 'night';
      case 'dawn':
        return 'dawn';
      default:
        return 'park';
    }
  };

  return (
    <Environment
      preset={getEnvironmentPreset()}
      background={false}
      blur={0.6}
    />
  );
};

// 단순화된 모델 컴포넌트 - 립싱크와 자연스러운 머리 움직임 포함
const Model = ({ lipSyncData, modelPath, position, ...props }) => {
  const group = useRef();
  const headRef = useRef();
  const { nodes, materials, animations } = useGLTF(modelPath || '/models/model1.glb');
  const [mixer] = useState(() => new THREE.AnimationMixer());

  // 모프 타겟 메시 참조
  const morphTargetMeshes = useRef([]);

  // 마지막으로 적용된 모프 타겟 값들
  const lastMorphValues = useRef({});

  // 이전 립싱크 데이터를 저장
  const prevLipSyncDataRef = useRef(null);

  // 머리 움직임을 위한 상태 및 참조
  const [headFound, setHeadFound] = useState(false);
  const initialHeadRotation = useRef(new THREE.Euler());
  const targetRotation = useRef(new THREE.Euler());
  const headMovementTimer = useRef(null);
  const lastHeadMovementTime = useRef(0);

  // 모델 스켈레톤 구조를 저장하기 위한 상태
  const [debugInfo, setDebugInfo] = useState('');

  // 랜덤 머리 움직임 타이머 설정 - 더 부드러운 움직임
  const setupRandomHeadMovement = () => {
    if (headMovementTimer.current) {
      clearTimeout(headMovementTimer.current);
    }

    // 다음 머리 움직임까지의 시간을 랜덤하게 설정 (3~8초) - 더 긴 시간 간격
    const nextMovementDelay = 3000 + Math.random() * 5000;

    headMovementTimer.current = setTimeout(() => {
      if (headRef.current) {
        // 머리 회전 각도를 랜덤하게 결정 (더 작고 부드러운 움직임)
        const randomX = (Math.random() * 0.08 - 0.04) + (Math.random() > 0.7 ? -0.06 : 0); // 약간 아래 보는 경향
        const randomY = Math.random() * 0.15 - 0.075; // 좌우 회전 축소
        const randomZ = Math.random() * 0.04 - 0.02; // 약간의 기울임 축소

        // 목표 회전 값 설정
        targetRotation.current.set(
          initialHeadRotation.current.x + randomX,
          initialHeadRotation.current.y + randomY,
          initialHeadRotation.current.z + randomZ
        );

        lastHeadMovementTime.current = Date.now();
      }

      // 다음 움직임 설정
      setupRandomHeadMovement();
    }, nextMovementDelay);
  };

  // 위치 직접 설정
  useEffect(() => {
    if (group.current && position) {
      group.current.position.set(position[0], position[1], position[2]);
    }
  }, [position]);

  // 모델 구조를 분석하는 함수
  const analyzeModelStructure = (object, depth = 0) => {
    let result = '';
    const indent = ' '.repeat(depth * 2);

    if (!object) return result;

    const type = object.type || 'Unknown';
    const name = object.name || 'Unnamed';

    result += `${indent}${name} (${type})`;

    if (object.isBone) {
      result += ' [Bone]';
    }
    if (object.isMesh) {
      result += ' [Mesh]';
      if (object.morphTargetDictionary) {
        result += ` [MorphTargets: ${Object.keys(object.morphTargetDictionary).join(', ')}]`;
      }
    }

    result += '\n';

    if (object.children && object.children.length > 0) {
      object.children.forEach(child => {
        result += analyzeModelStructure(child, depth + 1);
      });
    }

    return result;
  };

  // 디버그 정보를 상위 컴포넌트에 전달하기 위한 props 함수
  const { onDebugInfoChange } = props;

  // 모델이 변경될 때마다 새로운 설정 적용
  useEffect(() => {
    if (group.current) {
      // 모든 모프 타겟 메시 찾기 및 초기화
      morphTargetMeshes.current = [];
      lastMorphValues.current = {};
      setHeadFound(false);
      headRef.current = null;

      // 모델 구조 분석
      const structureInfo = analyzeModelStructure(group.current);
      console.log("Model Structure:\n", structureInfo);

      // 디버그 정보를 상위 컴포넌트로 전달
      if (props.onDebugInfoChange) {
        props.onDebugInfoChange(structureInfo);
      }

      // 뼈 및 메시 구조를 저장할 배열
      const bones = [];
      const meshes = [];

      group.current.traverse((object) => {
        // 모프 타겟이 있는 메시 찾기
        if (object.morphTargetDictionary && object.morphTargetInfluences) {
          morphTargetMeshes.current.push(object);
          meshes.push(object);

          // 모든 모프 타겟 이름과 인덱스 매핑 및 초기화
          Object.keys(object.morphTargetDictionary).forEach(key => {
            lastMorphValues.current[key] = 0;
          });
        }

        // 모든 본 저장
        if (object.isBone) {
          bones.push(object);
          console.log(`Found bone: ${object.name}`);
        }

        // 모든 메시 저장
        if (object.isMesh) {
          meshes.push(object);
        }

        // 메시에 그림자 설정
        if (object.isMesh) {
          object.castShadow = true;
          object.receiveShadow = true;

          // 메시 머티리얼 개선
          if (object.material) {
            if (object.material.roughness === undefined) {
              object.material.roughness = 0.8;
              object.material.metalness = 0.2;
            }
          }
        }
      });

      // 머리 본 찾기 - 이름 패턴 확장
      const headKeywords = ['head', 'skull', 'face', 'neck', 'cervical'];
      let foundHead = false;

      // 먼저 정확한 "Head" 본을 찾기
      for (const bone of bones) {
        const nameLower = bone.name.toLowerCase();
        if (nameLower === 'head') {
          console.log('Found exact Head bone:', bone.name);
          headRef.current = bone;
          foundHead = true;
          break;
        }
      }

      // 정확한 "Head"를 못 찾았다면 키워드 포함 본 찾기
      if (!foundHead) {
        for (const bone of bones) {
          const nameLower = bone.name.toLowerCase();
          for (const keyword of headKeywords) {
            if (nameLower.includes(keyword)) {
              console.log(`Found head-related bone: ${bone.name} (matched: ${keyword})`);
              headRef.current = bone;
              foundHead = true;
              break;
            }
          }
          if (foundHead) break;
        }
      }

      // 본에서 못 찾았다면 메시에서 찾기
      if (!foundHead) {
        for (const mesh of meshes) {
          const nameLower = mesh.name.toLowerCase();
          for (const keyword of headKeywords) {
            if (nameLower.includes(keyword)) {
              console.log(`Found head-related mesh: ${mesh.name} (matched: ${keyword})`);
              headRef.current = mesh;
              foundHead = true;
              break;
            }
          }
          if (foundHead) break;
        }
      }

      // 머리를 찾은 경우 초기 회전 저장
      if (headRef.current) {
        console.log(`Using ${headRef.current.name} for head movements`);
        if (headRef.current.rotation) {
          initialHeadRotation.current.copy(headRef.current.rotation);
          targetRotation.current.copy(headRef.current.rotation);
          setHeadFound(true);
        }
      }

      // 머리를 찾지 못했을 경우 루트 그룹 또는 다른 대안 사용
      if (!headFound) {
        console.log('Head not found, trying to find alternative');

        // 대안 1: 첫 번째 본 사용
        if (bones.length > 0) {
          console.log('Using first bone as head alternative:', bones[0].name);
          headRef.current = bones[0];
        }
        // 대안 2: 루트 그룹 사용
        else {
          console.log('No bones found, using root group for animation');
          headRef.current = group.current;
        }

        if (headRef.current && headRef.current.rotation) {
          initialHeadRotation.current.copy(headRef.current.rotation);
          targetRotation.current.copy(headRef.current.rotation);
          setHeadFound(true);
        }
      }
    }

    // 애니메이션 정리 및 새 설정
    if (mixer) {
      mixer.stopAllAction();

      if (animations && animations.length) {
        const action = mixer.clipAction(animations[0], group.current);
        action.play();

        action.loop = THREE.LoopRepeat;
        action.clampWhenFinished = false;
        action.timeScale = 0.8;
        action.setEffectiveWeight(1);
      }
    }

    // 이전 립싱크 데이터 초기화
    prevLipSyncDataRef.current = null;

    // 머리 움직임 타이머 시작
    setupRandomHeadMovement();

    // 정리 함수
    return () => {
      if (headMovementTimer.current) {
        clearTimeout(headMovementTimer.current);
      }
    };

  }, [animations, mixer, modelPath]);

  // 모프 타겟 애니메이션 최적화 함수 - 부드러운 전환 포함
  const animateMorphTarget = (mesh, targetName, targetValue, duration = 0.2) => {
    if (!mesh.morphTargetDictionary || mesh.morphTargetDictionary[targetName] === undefined) {
      return;
    }

    const index = mesh.morphTargetDictionary[targetName];
    const currentValue = mesh.morphTargetInfluences[index];
    const lastValue = lastMorphValues.current[targetName] || currentValue;

    // 부드러운 전환을 위해 보간
    const newValue = lastValue + (targetValue - lastValue) * (1 - Math.pow(0.1, duration));

    // 값 업데이트 및 저장
    mesh.morphTargetInfluences[index] = newValue;
    lastMorphValues.current[targetName] = newValue;
  };

  // 립싱크 데이터에 따라 모프 타겟 업데이트
  useEffect(() => {
    // 립싱크 데이터가 없거나 이전과 동일하면 처리하지 않음
    if (!lipSyncData || !lipSyncData.morphTargets ||
        JSON.stringify(lipSyncData) === JSON.stringify(prevLipSyncDataRef.current)) {
      return;
    }

    // 현재 데이터 저장
    prevLipSyncDataRef.current = lipSyncData;

    // 모든 모프 타겟 메시에 적용
    morphTargetMeshes.current.forEach(mesh => {
      // 모든 모핑 타겟 업데이트
      Object.entries(lipSyncData.morphTargets).forEach(([targetName, targetValue]) => {
        if (mesh.morphTargetDictionary && mesh.morphTargetDictionary[targetName] !== undefined) {
          animateMorphTarget(mesh, targetName, targetValue);
        }
      });
    });
  }, [lipSyncData]);

  // 애니메이션 업데이트 및 머리 움직임 보간 - 부드러운 버전
  useFrame((state, delta) => {
    // 애니메이션 믹서 업데이트
    mixer.update(delta);

    // 머리 움직임 애니메이션
    if (headRef.current && headFound) {
      // 더 낮은 lerpFactor 값으로 부드러운 움직임 구현
      const lerpFactor = Math.min(1, delta * 0.8);

      // 현재 회전과 목표 회전 사이를 매우 부드럽게 보간
      headRef.current.rotation.x += (targetRotation.current.x - headRef.current.rotation.x) * lerpFactor;
      headRef.current.rotation.y += (targetRotation.current.y - headRef.current.rotation.y) * lerpFactor;
      headRef.current.rotation.z += (targetRotation.current.z - headRef.current.rotation.z) * lerpFactor;

      // 대화 중에는 미세한 움직임만 추가 (립싱크 시 과도한 움직임 감소)
      if (lipSyncData && lipSyncData.morphTargets && lipSyncData.morphTargets.mouthOpen > 0.1) {
        // 매우 미세한 움직임만 추가
        const talkingMovement = Math.sin(state.clock.getElapsedTime() * 8) * 0.001;
        headRef.current.rotation.x += talkingMovement;
        headRef.current.rotation.y += talkingMovement * 0.2;
      } else {
        // 대화 중이 아닐 때도 더 부드럽고 자연스러운 미세한 움직임 추가
        const idleMovement = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.002;
        headRef.current.rotation.x += idleMovement;
        headRef.current.rotation.y += idleMovement * 0.2;
      }
    }
  });

  return (
    <group ref={group} {...props}>
      <primitive object={nodes.Scene || nodes.scene || Object.values(nodes)[0]} />
    </group>
  );
};

// 모델 뷰어 메인 컴포넌트 - 상반신 확대 버전
const ModelViewer = ({
  lipSyncData,
  background = 'default',
  modelPath = '/models/model1.glb',
  isSpeaking = false
}) => {
  // 모바일 장치 감지
  const [isMobile, setIsMobile] = useState(false);

  // 모델 경로 추적
  const [currentModelPath, setCurrentModelPath] = useState(modelPath);

  // 디버그 정보 상태 및 토글
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  // 모델 경로가 변경되면 업데이트
  useEffect(() => {
    setCurrentModelPath(modelPath);
    // 모델 프리로드
    useGLTF.preload(modelPath);
  }, [modelPath]);

  // 배경에 따른 씬 분위기 설정
  const sceneColor = useMemo(() => {
    switch(background) {
      case 'sunset':
        return {
          fog: new THREE.FogExp2('#ff7e57', 0.007),
          groundColor: '#e9b69a'
        };
      case 'night':
        return {
          fog: new THREE.FogExp2('#1a1a2e', 0.008),
          groundColor: '#2c2c3d'
        };
      case 'dawn':
        return {
          fog: new THREE.FogExp2('#ffcdb6', 0.005),
          groundColor: '#f3d9c9'
        };
      default: // 'default'
        return {
          fog: null,
          groundColor: '#e0e0e0'
        };
    }
  }, [background]);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const mobileRegex = /android|iphone|ipad|ipod|blackberry|kindle|silk|opera mini/i;
      setIsMobile(mobileRegex.test(userAgent) || window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    // 개발 모드 토글을 위한 키보드 이벤트 리스너
    const handleKeyPress = (e) => {
      if (e.key === 'd' && e.ctrlKey) {
        setShowDebug(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  return (
    <div className={`model-viewer background-${background}`}>
      <Canvas
        camera={{
          // 카메라 위치 변경 - 더 가깝게, 약간 높게 설정하여 상반신에 초점
          position: [0, 0.2, isMobile ? 1.2 : 1.5],
          fov: 15, // 시야각 축소로 줌인 효과 (기존 50 → 30)
          near: 0.1,
          far: 1000
        }}
        shadows={{
          type: 'PCFSoftShadowMap',
          enabled: true
        }}
        style={{ background: 'transparent' }}
        dpr={[1, 1.5]} // 성능 최적화
        performance={{ min: 0.5 }}
        gl={{
          antialias: true,
          outputColorSpace: THREE.SRGBColorSpace
        }}
        fog={sceneColor.fog}
      >
        {/* 동적 조명 */}
        <DynamicLighting background={background} />

        {/* 메인 모델 - 위치 조정으로 상반신 중심 배치 */}
        <Model
          lipSyncData={lipSyncData}
          modelPath={currentModelPath}
          position={[0, -1.7, 0]} // 위치 상향 조정 (y축 상승)
          scale={isMobile ? 0.9 : 1.0} // 스케일 약간 증가
          rotation={[0, 0, 0]}
          castShadow
          onDebugInfoChange={setDebugInfo}
        />

        {/* 카메라 컨트롤 - 제한된 범위 */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 2.2} // 더 제한된 상하 움직임
          rotateSpeed={0.4} // 회전 속도 감소
          enableDamping={true}
          dampingFactor={0.1}
        />

        {/* 배경 하늘 */}
        <DynamicSky background={background} />

        {/* 환경 */}
        <EnvironmentEffects background={background} />
      </Canvas>

      {showDebug && (
        <div className="debug-panel">
          <h3>Debug Info</h3>
          <pre>{debugInfo}</pre>
        </div>
      )}
    </div>
  );
};

export default ModelViewer;

// 기본 모델 프리로딩
useGLTF.preload('/models/model1.glb');