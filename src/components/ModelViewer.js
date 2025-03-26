import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, Stars, Sky, Grid, useTexture, Cloud } from '@react-three/drei';
import * as THREE from 'three';
import '../styles/ModelViewer.css';
import HouseModel from './HouseModel'; // 집 모델 컴포넌트 import

// 움직이는 구름 컴포넌트
const Clouds = () => {
  return (
    <group>
      <Cloud
        opacity={0.7}
        speed={0.4}
        width={10}
        depth={1.5}
        segments={20}
        position={[-10, 15, -15]}
      />
      <Cloud
        opacity={0.5}
        speed={0.3}
        width={8}
        depth={1}
        segments={15}
        position={[10, 12, -10]}
      />
      <Cloud
        opacity={0.4}
        speed={0.2}
        width={6}
        depth={0.8}
        segments={10}
        position={[0, 10, -5]}
      />
    </group>
  )
};

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
      {background !== 'night' && <Clouds />}
    </>
  );
};

// 그림자 디버깅 헬퍼 컴포넌트
const ShadowHelper = () => {
  const { scene } = useThree();

  useEffect(() => {
    // 씬의 모든 조명을 순회하며 그림자 카메라 헬퍼 추가
    scene.traverse((object) => {
      if (object.isDirectionalLight && object.castShadow) {
        const helper = new THREE.CameraHelper(object.shadow.camera);
        scene.add(helper);

        return () => {
          scene.remove(helper);
        };
      }
    });
  }, [scene]);

  return null;
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
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
        shadow-normalBias={0.02}
      />

      {/* 앰비언트 라이트 */}
      <ambientLight intensity={lights.ambientLight.intensity} color={lights.ambientLight.color} />

      {/* 포인트 라이트 - 얼굴 부분을 밝게 */}
      <pointLight
        position={[0, 2, 3]}
        intensity={lights.pointLight.intensity}
        color={lights.pointLight.color}
      />

      {/* 집 모델 뒤쪽에 추가 조명 */}
      <pointLight
        position={[0, 4, -10]}
        intensity={lights.pointLight.intensity * 0.7}
        color={lights.pointLight.color}
        distance={15}
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

const Model = ({ lipSyncData, modelPath, position, ...props }) => {
  const group = useRef();
  const { nodes, materials, animations } = useGLTF(modelPath || '/models/model1.glb');
  const [mixer] = useState(() => new THREE.AnimationMixer());

  useEffect(() => {
    if (group.current) {
      //console.log("모델 뼈대 구조 출력:", modelPath);

      // 모든 본 이름 출력
      const bones = [];
      group.current.traverse((object) => {
        if (object.isBone) {
          bones.push({
            name: object.name,
            parent: object.parent ? object.parent.name : "none"
          });
          //console.log(`본 발견: ${object.name}`);
        }
      });

      if (bones.length > 0) {
        //console.table(bones); // 표 형태로 정리해서 출력
      }
    }
  }, [modelPath]);

  // 입 모양 제어를 위한 참조
  const morphTargetMesh = useRef();

  // 애니메이션 시간 추적
  const clock = useRef(new THREE.Clock());

  // 자연스러운 대기 애니메이션 상태
  const [idleAnimation, setIdleAnimation] = useState(null);

  // 위치 직접 설정
  useEffect(() => {
    if (group.current && position) {
      // 직접 position 설정
      group.current.position.set(position[0], position[1], position[2]);
    }
  }, [position]);

  // 모델이 변경될 때마다 새로운 설정 적용
  useEffect(() => {
    if (group.current) {
      // 모델 내에서 모프 타겟이 있는 메시 찾기
      morphTargetMesh.current = null; // 이전 참조 초기화

      group.current.traverse((object) => {
        if (object.morphTargetDictionary) {
          morphTargetMesh.current = object;
          //console.log('모프 타겟을 가진 메시 찾음:', object.name);
          //console.log('사용 가능한 모프 타겟:', object.morphTargetDictionary);

          // 디버깅: 모든 모프 타겟 목록 출력
          if (object.morphTargetDictionary) {
            console.log('모든 모프 타겟 목록:');
            for (const [key, value] of Object.entries(object.morphTargetDictionary)) {
              //console.log(`  ${key}: 인덱스 ${value}`);
            }
            //console.log('모프 타겟 영향값 배열 길이:', object.morphTargetInfluences ? object.morphTargetInfluences.length : '없음');
          }
        }

        // 모든 메시에 그림자 설정
        if (object.isMesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
    }

    // 애니메이션 정리
    if (mixer) {
      mixer.stopAllAction();
    }

    // 새 애니메이션 설정
    if (animations && animations.length) {
      // 기본 애니메이션 (첫 번째) 사용
      const action = mixer.clipAction(animations[0], group.current);
      action.play();
      setIdleAnimation(action);

      // 애니메이션 설정 - 루프 및 페이드 시간 조정
      action.loop = THREE.LoopRepeat;
      action.clampWhenFinished = false;
      action.timeScale = 0.8; // 약간 느리게 재생
      action.setEffectiveWeight(1);
    }

    // 클럭 리셋
    if (clock.current) {
      clock.current = new THREE.Clock();
    }
  }, [animations, mixer, modelPath]);

  // 립싱크 데이터에 따라 입 모양 업데이트
  useEffect(() => {
    if (morphTargetMesh.current && lipSyncData) {
      const mesh = morphTargetMesh.current;

      // mouthOpen 모프 타겟 제어 (입 벌림)
      if (mesh.morphTargetDictionary && mesh.morphTargetDictionary.mouthOpen !== undefined) {
        const mouthOpenIndex = mesh.morphTargetDictionary.mouthOpen;
        mesh.morphTargetInfluences[mouthOpenIndex] = lipSyncData.intensity;
      }

      // mouthSmile 모프 타겟 제어 (미소)
      if (mesh.morphTargetDictionary && mesh.morphTargetDictionary.mouthSmile !== undefined) {
        const mouthSmileIndex = mesh.morphTargetDictionary.mouthSmile;
        // 말할 때 약간의 미소를 추가 (강도의 절반 정도)
        mesh.morphTargetInfluences[mouthSmileIndex] = lipSyncData.intensity * 0.5;
      }
    }
  }, [lipSyncData]);

  // 자연스러운 대기 움직임 및 애니메이션 업데이트
  useFrame((state, delta) => {
    // 애니메이션 믹서 업데이트
    mixer.update(delta);

    // 현재 시간 가져오기
    const time = clock.current.getElapsedTime();

    // 모델에 자연스러운 미세 움직임 추가
    if (group.current && position) {
      // 훨씬 약한 강도의 신체 부위별 움직임 애니메이션
      group.current.traverse((object) => {
        // 본 요소에만 애니메이션 적용
        if (object.isBone) {
          const boneName = object.name.toLowerCase();

          // 머리와 목 움직임
          if (boneName.includes('head')) {
            // 머리 자연스럽게 움직이기 - 주파수 낮추기(덜 빠르게)
            object.rotation.z += Math.sin(time * 6) * 0.0002;
            object.rotation.x += Math.sin(time * 6) * 0.0002;
            object.rotation.y += Math.sin(time * 6) * 0.0001;
          }
          else if (boneName.includes('neck')) {
            // 목은 머리보다 약간 적게 움직임
            object.rotation.z += Math.sin(time * 5) * 0.0002;
            object.rotation.x += Math.sin(time * 4) * 0.0002;
          }

          // 어깨 움직임
          else if (boneName.includes('shoulder')) {
            // 호흡과 함께 미세하게 올라갔다 내려갔다 하는 효과
            const isLeft = boneName.includes('left');
            const direction = isLeft ? 1 : -1;
            object.rotation.z += Math.sin(time * 3) * 0.0006 * direction;
          }

          // 상체 움직임 (척추)
          else if (boneName.includes('spine')) {
            // 호흡에 따라 움직임
            const spineIndex = boneName.match(/\d+$/);
            if (spineIndex) {
              const level = parseInt(spineIndex[0]);
              // 상부 척추는 호흡에 더 영향 받음
              if (level === 2) {
                object.rotation.x += Math.sin(time * 4) * 0.0002;
              } else {
                // 하부 척추는 덜 움직임
                object.rotation.x += Math.sin(time * 4) * 0.0002;
              }
            }
          }

          // 팔 움직임 - 덜 과격하게
          else if (boneName.includes('arm') && !boneName.includes('fore')) {
            const isLeft = boneName.includes('left');
            const direction = isLeft ? 1 : -1;

            // 팔을 미세하게 움직이기 (주파수와 강도 줄임)
            object.rotation.z += Math.sin(time * 6) * 0.0003 * direction;
          }
          else if (boneName.includes('forearm')) {
            // 팔꿈치 미세하게 움직이기 (주파수와 강도 줄임)
            object.rotation.x += Math.sin(time * 4) * 0.0003;
          }

          // 손과 손가락 움직임 - 덜 과격하게
          else if (boneName.includes('hand') || boneName.includes('finger') || boneName.includes('thumb')) {
            const fingerType = boneName.includes('thumb') ? 'thumb' :
                            boneName.includes('index') ? 'index' :
                            boneName.includes('middle') ? 'middle' :
                            boneName.includes('ring') ? 'ring' : 'pinky';

            // 손가락마다 다른 속도로 미세하게 움직임 (주파수 낮춤)
            const fingerSpeeds = {
              'thumb': 0.3,
              'index': 0.25,
              'middle': 0.2,
              'ring': 0.23,
              'pinky': 0.27
            };

            const fingerIndex = parseInt((boneName.match(/\d+$/) || ["0"])[0]);
            const speed = fingerSpeeds[fingerType] || 0.2;

            // 각 손가락 관절마다 약간 다른 움직임
            if (fingerIndex === 1) {
              // 첫번째 관절은 조금 더 움직임
              object.rotation.z += Math.sin(time * speed) * 0.0003;
            } else {
              // 다른 관절은 덜 움직임
              object.rotation.z += Math.sin(time * speed) * 0.0002;
            }
          }

          // 다리는 최소한의 움직임만
          else if (boneName.includes('upleg')) {
            // 무게 중심 이동 효과
            const isLeft = boneName.includes('left');
            const direction = isLeft ? 1 : -1;
            const weightShiftSpeed = 0.05; // 매우 느린 체중 이동


          }
        }
      });
      // 호흡 효과
      const breathingIntensity = 0.003; // 적당한 호흡 강도
      const breathingSpeed = 1.5;
      const breathEffect = Math.sin(time * breathingSpeed) * breathingIntensity;

      // 위치 변경 - Y축에 호흡 효과 적용
      group.current.position.y = position[1] + breathEffect;
    }

    // 눈 깜빡임 처리
    if (morphTargetMesh.current) {
      const mesh = morphTargetMesh.current;

      // 모프 타겟 사전 확인
      if (mesh.morphTargetDictionary) {
        // 립싱크 중에는 눈 깜빡임 억제 또는 조정
        const isSpeaking = lipSyncData && lipSyncData.intensity > 0.1;

        // 말하는 중이면 눈 깜빡임 간격을 길게 조정 (덜 자주 깜빡이게)
        const baseBlinkInterval = isSpeaking ? 7 : 5; // 말할 때는 더 길게
        // 랜덤성 추가 (말할 때는 변동폭 작게)
        const randomFactor = isSpeaking ? 1 : 2;

        // 최종 깜빡임 간격 계산
        const blinkInterval = baseBlinkInterval + Math.sin(time * 0.1) * randomFactor;

        // 깜빡임 시간 계산 (립싱크 상태가 변경될 때 깜빡임 타이밍 리셋 방지)
        // 시간을 더 큰 단위로 나누어 타이밍 안정화
        const stableTime = Math.floor(time / 10) * 10 + (time % 10);
        const blinkTime = stableTime % blinkInterval;
        const blinkDuration = 0.15;

        // 왼쪽 눈 깜빡임 처리
        if (mesh.morphTargetDictionary.eyeBlinkLeft !== undefined) {
          const eyeBlinkLeftIndex = mesh.morphTargetDictionary.eyeBlinkLeft;

          if (blinkTime < blinkDuration) {
            // 자연스러운 눈 깜빡임 (위아래로 빠르게)
            const blinkValue = Math.sin(blinkTime / blinkDuration * Math.PI);
            mesh.morphTargetInfluences[eyeBlinkLeftIndex] = blinkValue;
          } else {
            // 눈 뜨기
            mesh.morphTargetInfluences[eyeBlinkLeftIndex] = 0;
          }
        }

        // 오른쪽 눈 깜빡임 처리 (왼쪽과 동일한 타이밍)
        if (mesh.morphTargetDictionary.eyeBlinkRight !== undefined) {
          const eyeBlinkRightIndex = mesh.morphTargetDictionary.eyeBlinkRight;

          if (blinkTime < blinkDuration) {
            const blinkValue = Math.sin(blinkTime / blinkDuration * Math.PI);
            mesh.morphTargetInfluences[eyeBlinkRightIndex] = blinkValue;
          } else {
            mesh.morphTargetInfluences[eyeBlinkRightIndex] = 0;
          }
        }

        // 가끔 미소짓기 (립싱크 중이 아닐 때만)
        if (mesh.morphTargetDictionary.mouthSmile !== undefined &&
            (!lipSyncData || lipSyncData.intensity < 0.1)) {

          const mouthSmileIndex = mesh.morphTargetDictionary.mouthSmile;

          // 가끔 미소 짓기 (약 25-35초마다)
          const smileInterval = 30 + Math.sin(time * 0.05) * 5;
          const smileTime = time % smileInterval;
          const smileDuration = 3;

          if (smileTime < smileDuration) {
            // 부드럽게 시작하고 끝나는 미소
            let smileValue = 0;

            if (smileTime < 1) {
              // 미소 시작
              smileValue = smileTime * 0.2;
            } else if (smileTime > smileDuration - 1) {
              // 미소 끝내기
              smileValue = 0.2 * (1 - (smileTime - (smileDuration - 1)));
            } else {
              // 미소 유지
              smileValue = 0.2;
            }

            mesh.morphTargetInfluences[mouthSmileIndex] = smileValue;
          } else {
            // 기본 표정 (말하는 중이 아니면)
            if (!lipSyncData || lipSyncData.intensity < 0.1) {
              mesh.morphTargetInfluences[mouthSmileIndex] = 0;
            }
          }
        }
      }
    }
  });

  return (
    <group ref={group} {...props}>
      {/* position은 이제 useEffect와 useFrame에서 직접 처리하므로 여기서는 전달하지 않음 */}
      <primitive object={nodes.Scene || nodes.scene || Object.values(nodes)[0]} />
    </group>
  );
};

// 모델 뷰어 메인 컴포넌트
const ModelViewer = ({ lipSyncData, background = 'default', modelPath = '/models/model1.glb' }) => {
  // 모바일 장치 감지
  const [isMobile, setIsMobile] = useState(false);

  // 모델 경로 추적
  const [currentModelPath, setCurrentModelPath] = useState(modelPath);

  // 모델 경로가 변경되면 업데이트
  useEffect(() => {
    setCurrentModelPath(modelPath);
    //console.log("모델 경로 업데이트:", modelPath);

    // 모델 프리로드
    useGLTF.preload(modelPath);
  }, [modelPath]);

  // 배경에 따른 씬 분위기 설정
  const sceneColor = useMemo(() => {
    switch(background) {
      case 'sunset':
        return {
          fog: new THREE.FogExp2('#ff7e57', 0.007),
          groundColor: '#e9b69a',
          gridColor: '#b77c66'
        };
      case 'night':
        return {
          fog: new THREE.FogExp2('#1a1a2e', 0.008),
          groundColor: '#2c2c3d',
          gridColor: '#444464'
        };
      case 'dawn':
        return {
          fog: new THREE.FogExp2('#ffcdb6', 0.005),
          groundColor: '#f3d9c9',
          gridColor: '#bc9483'
        };
      default: // 'default'
        return {
          fog: null,
          groundColor: '#e0e0e0',
          gridColor: '#727272'
        };
    }
  }, [background]);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const mobileRegex = /android|iphone|ipad|ipod|blackberry|kindle|silk|opera mini/i;
      setIsMobile(mobileRegex.test(userAgent));
    };

    checkMobile();

    // 화면 크기 변경 시 모바일 여부 다시 확인
    const handleResize = () => {
      checkMobile();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`model-viewer background-${background}`}>
      <Canvas
        camera={{
          position: [0, 1.5, isMobile ? 3 : 4],
          fov: 50,
          near: 0.1,
          far: 1000
        }}
        shadows={{
          type: 'PCFSoftShadowMap',
          enabled: true
        }}
        style={{ background: 'transparent' }}
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
        gl={{
          antialias: true,
          outputColorSpace: THREE.SRGBColorSpace
        }}
        fog={sceneColor.fog}
      >
        {/* 동적 조명 */}
        <DynamicLighting background={background} />

        {/* 바닥 */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -1, 0]}
          receiveShadow
        >
          <planeGeometry args={[100, 100]} />
          <meshPhysicalMaterial
            color={sceneColor.groundColor}
            roughness={0.8}
            metalness={0.1}
            reflectivity={0.1}
          />
        </mesh>

        {/* 모델 - 현재 선택된 모델 경로 사용 */}
        <Model
          lipSyncData={lipSyncData}
          modelPath={currentModelPath}
          position={[0, -0.87, 0]}
          scale={isMobile ? 0.9 : 1}
          rotation={[0, 0, 0]}
          castShadow
        />

        {/* 집 모델 - 사람 모델 뒤에 배치 */}
        <HouseModel
          position={[1.5, -1.7, -1]}
          scale={isMobile ? 2 : 3}
          rotation={[0, Math.PI / 12, 0]}
        />

        {/* 카메라 컨트롤 */}
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 1.5}
          minDistance={2}
          maxDistance={20} // 더 멀리 볼 수 있도록 조정
          enableDamping={true}
          dampingFactor={0.1}
        />

        {/* 배경 하늘과 환경 효과 */}
        <DynamicSky background={background} />

        {/* 그리드 바닥 - 더 세련된 디자인 */}
        <Grid
          position={[0, -1.01, 0]}
          args={[100, 100]} // 더 넓은 그리드
          cellSize={0.8}
          cellThickness={0.6}
          cellColor="#353535"
          sectionSize={4}
          sectionThickness={1.2}
          sectionColor={sceneColor.gridColor}
          fadeDistance={50} // 더 멀리 표시
          fadeStrength={1.5}
          followCamera={false}
          infiniteGrid={true}
        />

        {/* 환경 */}
        <EnvironmentEffects background={background} />
      </Canvas>
    </div>
  );
};

export default ModelViewer;

// 기본 모델 프리로딩
useGLTF.preload('/models/model1.glb');