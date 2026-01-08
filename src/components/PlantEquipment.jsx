/**
 * PLANT EQUIPMENT - 3D Industrial Models
 * Realistic refinery/plant equipment for The Map visualization
 * 
 * Equipment types:
 * - Distillation Column (tall tower with trays)
 * - Reactor (spherical or cylindrical vessel)
 * - Heat Exchanger (shell & tube)
 * - Storage Tank (large cylindrical)
 * - Pump (small motor unit)
 * - Control Room (building)
 * - Flare Stack (tower with flame)
 * - Pipe connections
 */

import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Cylinder, Sphere, Box, Cone, Torus } from '@react-three/drei'
import * as THREE from 'three'

// Color palette for equipment
const EQUIPMENT_COLORS = {
  steel: '#708090',
  steelDark: '#4a5568',
  copper: '#b87333',
  insulation: '#d4d4d4',
  warning: '#f59e0b',
  critical: '#ef4444',
  safe: '#10b981',
  flame: '#ff6b35',
  flameGlow: '#ffd93d',
  concrete: '#6b7280',
  pipe: '#374151'
}

/**
 * Distillation Column - Tall fractionating tower
 */
export function DistillationColumn({ position = [0, 0, 0], height = 8, radius = 0.8, data, onClick, selected }) {
  const groupRef = useRef()
  
  // Subtle idle animation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.02
    }
  })
  
  const trayCount = Math.floor(height / 1.2)
  
  return (
    <group ref={groupRef} position={position} onClick={onClick}>
      {/* Main column body */}
      <Cylinder args={[radius, radius * 1.1, height, 32]} position={[0, height / 2, 0]}>
        <meshStandardMaterial 
          color={selected ? '#3b82f6' : EQUIPMENT_COLORS.steel} 
          metalness={0.7} 
          roughness={0.3}
        />
      </Cylinder>
      
      {/* Column top dome */}
      <Sphere args={[radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, height, 0]}>
        <meshStandardMaterial color={EQUIPMENT_COLORS.steel} metalness={0.7} roughness={0.3} />
      </Sphere>
      
      {/* Column bottom cone */}
      <Cone args={[radius * 1.1, 1, 32]} position={[0, -0.5, 0]} rotation={[Math.PI, 0, 0]}>
        <meshStandardMaterial color={EQUIPMENT_COLORS.steelDark} metalness={0.6} roughness={0.4} />
      </Cone>
      
      {/* Tray levels (visible rings) */}
      {Array.from({ length: trayCount }).map((_, i) => (
        <Torus 
          key={i} 
          args={[radius + 0.05, 0.03, 8, 32]} 
          position={[0, 1 + i * 1.2, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <meshStandardMaterial color={EQUIPMENT_COLORS.steelDark} metalness={0.5} roughness={0.5} />
        </Torus>
      ))}
      
      {/* Platform/walkway */}
      <Cylinder args={[radius * 1.8, radius * 1.8, 0.1, 32]} position={[0, height * 0.6, 0]}>
        <meshStandardMaterial color={EQUIPMENT_COLORS.steelDark} metalness={0.4} roughness={0.6} />
      </Cylinder>
      
      {/* Side nozzles (inlet/outlet) */}
      {[0.2, 0.5, 0.8].map((h, i) => (
        <Cylinder 
          key={i}
          args={[0.15, 0.15, 0.6, 16]} 
          position={[radius + 0.3, height * h, 0]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <meshStandardMaterial color={EQUIPMENT_COLORS.pipe} metalness={0.6} roughness={0.4} />
        </Cylinder>
      ))}
      
      {/* Label */}
      {data && (
        <Html position={[0, height + 1.5, 0]} center>
          <div style={{
            background: selected ? 'rgba(59, 130, 246, 0.95)' : 'rgba(0,0,0,0.85)',
            color: 'white',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '10px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            textAlign: 'center'
          }}>
            <div style={{ fontWeight: '600' }}>{data.name}</div>
            <div style={{ opacity: 0.8 }}>{data.assetCount} assets</div>
          </div>
        </Html>
      )}
    </group>
  )
}

/**
 * Reactor Vessel - Spherical or horizontal drum
 */
export function Reactor({ position = [0, 0, 0], radius = 1.5, type = 'sphere', data, onClick, selected }) {
  const groupRef = useRef()
  
  return (
    <group ref={groupRef} position={position} onClick={onClick}>
      {type === 'sphere' ? (
        <>
          {/* Spherical reactor */}
          <Sphere args={[radius, 32, 32]}>
            <meshStandardMaterial 
              color={selected ? '#3b82f6' : EQUIPMENT_COLORS.steel} 
              metalness={0.7} 
              roughness={0.3}
            />
          </Sphere>
          
          {/* Support legs */}
          {[0, 120, 240].map((angle, i) => {
            const x = Math.cos(angle * Math.PI / 180) * radius * 0.8
            const z = Math.sin(angle * Math.PI / 180) * radius * 0.8
            return (
              <Cylinder key={i} args={[0.1, 0.15, radius * 1.2, 8]} position={[x, -radius * 0.6, z]}>
                <meshStandardMaterial color={EQUIPMENT_COLORS.steelDark} metalness={0.5} roughness={0.5} />
              </Cylinder>
            )
          })}
        </>
      ) : (
        <>
          {/* Horizontal drum reactor */}
          <Cylinder args={[radius * 0.7, radius * 0.7, radius * 2.5, 32]} rotation={[0, 0, Math.PI / 2]}>
            <meshStandardMaterial 
              color={selected ? '#3b82f6' : EQUIPMENT_COLORS.steel} 
              metalness={0.7} 
              roughness={0.3}
            />
          </Cylinder>
          
          {/* End caps */}
          <Sphere args={[radius * 0.7, 32, 16]} position={[radius * 1.25, 0, 0]}>
            <meshStandardMaterial color={EQUIPMENT_COLORS.steel} metalness={0.7} roughness={0.3} />
          </Sphere>
          <Sphere args={[radius * 0.7, 32, 16]} position={[-radius * 1.25, 0, 0]}>
            <meshStandardMaterial color={EQUIPMENT_COLORS.steel} metalness={0.7} roughness={0.3} />
          </Sphere>
          
          {/* Saddle supports */}
          <Box args={[0.3, radius * 0.5, radius * 1.8]} position={[radius * 0.8, -radius * 0.5, 0]}>
            <meshStandardMaterial color={EQUIPMENT_COLORS.concrete} roughness={0.8} />
          </Box>
          <Box args={[0.3, radius * 0.5, radius * 1.8]} position={[-radius * 0.8, -radius * 0.5, 0]}>
            <meshStandardMaterial color={EQUIPMENT_COLORS.concrete} roughness={0.8} />
          </Box>
        </>
      )}
      
      {/* Label */}
      {data && (
        <Html position={[0, radius + 1, 0]} center>
          <div style={{
            background: selected ? 'rgba(59, 130, 246, 0.95)' : 'rgba(0,0,0,0.85)',
            color: 'white',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '10px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            textAlign: 'center'
          }}>
            <div style={{ fontWeight: '600' }}>{data.name}</div>
            <div style={{ opacity: 0.8 }}>{data.assetCount} assets</div>
          </div>
        </Html>
      )}
    </group>
  )
}

/**
 * Storage Tank - Large cylindrical tank
 */
export function StorageTank({ position = [0, 0, 0], radius = 2, height = 3, data, onClick, selected }) {
  return (
    <group position={position} onClick={onClick}>
      {/* Tank body */}
      <Cylinder args={[radius, radius, height, 32]} position={[0, height / 2, 0]}>
        <meshStandardMaterial 
          color={selected ? '#3b82f6' : '#f5f5f5'} 
          metalness={0.3} 
          roughness={0.7}
        />
      </Cylinder>
      
      {/* Floating roof */}
      <Cylinder args={[radius - 0.1, radius - 0.1, 0.2, 32]} position={[0, height * 0.7, 0]}>
        <meshStandardMaterial color={EQUIPMENT_COLORS.steelDark} metalness={0.5} roughness={0.5} />
      </Cylinder>
      
      {/* Tank roof edge */}
      <Torus args={[radius, 0.1, 8, 32]} position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color={EQUIPMENT_COLORS.steel} metalness={0.6} roughness={0.4} />
      </Torus>
      
      {/* Staircase (spiral) */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = i * Math.PI / 4
        const y = (i / 8) * height
        return (
          <Box 
            key={i}
            args={[0.3, 0.05, 0.8]} 
            position={[
              Math.cos(angle) * (radius + 0.4),
              y + 0.3,
              Math.sin(angle) * (radius + 0.4)
            ]}
            rotation={[0, -angle, 0]}
          >
            <meshStandardMaterial color={EQUIPMENT_COLORS.steelDark} metalness={0.4} roughness={0.6} />
          </Box>
        )
      })}
      
      {/* Label */}
      {data && (
        <Html position={[0, height + 1, 0]} center>
          <div style={{
            background: selected ? 'rgba(59, 130, 246, 0.95)' : 'rgba(0,0,0,0.85)',
            color: 'white',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '10px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            textAlign: 'center'
          }}>
            <div style={{ fontWeight: '600' }}>{data.name}</div>
            <div style={{ opacity: 0.8 }}>{data.assetCount} assets</div>
          </div>
        </Html>
      )}
    </group>
  )
}

/**
 * Heat Exchanger - Shell and tube type
 */
export function HeatExchanger({ position = [0, 0, 0], length = 3, radius = 0.5, data, onClick, selected }) {
  return (
    <group position={position} onClick={onClick}>
      {/* Shell */}
      <Cylinder args={[radius, radius, length, 32]} rotation={[0, 0, Math.PI / 2]} position={[0, radius + 0.3, 0]}>
        <meshStandardMaterial 
          color={selected ? '#3b82f6' : EQUIPMENT_COLORS.steel} 
          metalness={0.7} 
          roughness={0.3}
        />
      </Cylinder>
      
      {/* End bonnets */}
      <Sphere args={[radius * 0.9, 32, 16]} position={[length / 2, radius + 0.3, 0]}>
        <meshStandardMaterial color={EQUIPMENT_COLORS.copper} metalness={0.6} roughness={0.4} />
      </Sphere>
      <Sphere args={[radius * 0.9, 32, 16]} position={[-length / 2, radius + 0.3, 0]}>
        <meshStandardMaterial color={EQUIPMENT_COLORS.copper} metalness={0.6} roughness={0.4} />
      </Sphere>
      
      {/* Inlet/outlet nozzles */}
      <Cylinder args={[0.12, 0.12, 0.5, 16]} position={[length / 3, radius + 0.3 + radius, 0]} rotation={[0, 0, 0]}>
        <meshStandardMaterial color={EQUIPMENT_COLORS.pipe} metalness={0.6} roughness={0.4} />
      </Cylinder>
      <Cylinder args={[0.12, 0.12, 0.5, 16]} position={[-length / 3, radius + 0.3 + radius, 0]} rotation={[0, 0, 0]}>
        <meshStandardMaterial color={EQUIPMENT_COLORS.pipe} metalness={0.6} roughness={0.4} />
      </Cylinder>
      
      {/* Support saddles */}
      <Box args={[0.2, 0.3, radius * 2.2]} position={[length / 3, 0.15, 0]}>
        <meshStandardMaterial color={EQUIPMENT_COLORS.concrete} roughness={0.8} />
      </Box>
      <Box args={[0.2, 0.3, radius * 2.2]} position={[-length / 3, 0.15, 0]}>
        <meshStandardMaterial color={EQUIPMENT_COLORS.concrete} roughness={0.8} />
      </Box>
      
      {/* Label */}
      {data && (
        <Html position={[0, radius * 2 + 1, 0]} center>
          <div style={{
            background: selected ? 'rgba(59, 130, 246, 0.95)' : 'rgba(0,0,0,0.85)',
            color: 'white',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '10px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            textAlign: 'center'
          }}>
            <div style={{ fontWeight: '600' }}>{data.name}</div>
            <div style={{ opacity: 0.8 }}>{data.assetCount} assets</div>
          </div>
        </Html>
      )}
    </group>
  )
}

/**
 * Flare Stack - Emergency flare system
 */
export function FlareStack({ position = [0, 0, 0], height = 12, data, onClick, selected }) {
  const flameRef = useRef()
  
  // Animate flame
  useFrame((state) => {
    if (flameRef.current) {
      flameRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.2
      flameRef.current.scale.x = 1 + Math.cos(state.clock.elapsedTime * 8) * 0.1
    }
  })
  
  return (
    <group position={position} onClick={onClick}>
      {/* Stack structure */}
      <Cylinder args={[0.3, 0.5, height, 8]} position={[0, height / 2, 0]}>
        <meshStandardMaterial 
          color={selected ? '#3b82f6' : EQUIPMENT_COLORS.steelDark} 
          metalness={0.5} 
          roughness={0.5}
        />
      </Cylinder>
      
      {/* Flare tip */}
      <Cone args={[0.4, 0.8, 8]} position={[0, height, 0]}>
        <meshStandardMaterial color={EQUIPMENT_COLORS.steelDark} metalness={0.6} roughness={0.4} />
      </Cone>
      
      {/* Flame */}
      <group ref={flameRef} position={[0, height + 0.8, 0]}>
        <Cone args={[0.3, 1.5, 8]} position={[0, 0.75, 0]}>
          <meshStandardMaterial 
            color={EQUIPMENT_COLORS.flame} 
            emissive={EQUIPMENT_COLORS.flame}
            emissiveIntensity={2}
            transparent
            opacity={0.9}
          />
        </Cone>
        <Cone args={[0.15, 1, 8]} position={[0, 1, 0]}>
          <meshStandardMaterial 
            color={EQUIPMENT_COLORS.flameGlow} 
            emissive={EQUIPMENT_COLORS.flameGlow}
            emissiveIntensity={3}
            transparent
            opacity={0.8}
          />
        </Cone>
        {/* Flame light */}
        <pointLight color={EQUIPMENT_COLORS.flame} intensity={50} distance={15} />
      </group>
      
      {/* Support structure (lattice simplified) */}
      {[0, 90, 180, 270].map((angle, i) => {
        const x = Math.cos(angle * Math.PI / 180) * 0.8
        const z = Math.sin(angle * Math.PI / 180) * 0.8
        return (
          <Cylinder key={i} args={[0.05, 0.08, height * 0.7, 6]} position={[x, height * 0.35, z]}>
            <meshStandardMaterial color={EQUIPMENT_COLORS.steelDark} metalness={0.4} roughness={0.6} />
          </Cylinder>
        )
      })}
      
      {/* Label */}
      {data && (
        <Html position={[0, height + 3, 0]} center>
          <div style={{
            background: selected ? 'rgba(59, 130, 246, 0.95)' : 'rgba(0,0,0,0.85)',
            color: 'white',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '10px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            textAlign: 'center'
          }}>
            <div style={{ fontWeight: '600' }}>{data.name}</div>
            <div style={{ opacity: 0.8 }}>{data.assetCount} assets</div>
          </div>
        </Html>
      )}
    </group>
  )
}

/**
 * Control Room - Building with windows
 */
export function ControlRoom({ position = [0, 0, 0], width = 4, depth = 3, height = 2, data, onClick, selected }) {
  return (
    <group position={position} onClick={onClick}>
      {/* Main building */}
      <Box args={[width, height, depth]} position={[0, height / 2, 0]}>
        <meshStandardMaterial 
          color={selected ? '#3b82f6' : '#e2e8f0'} 
          metalness={0.1} 
          roughness={0.8}
        />
      </Box>
      
      {/* Roof */}
      <Box args={[width + 0.4, 0.2, depth + 0.4]} position={[0, height + 0.1, 0]}>
        <meshStandardMaterial color={EQUIPMENT_COLORS.steelDark} metalness={0.3} roughness={0.7} />
      </Box>
      
      {/* Windows (front) */}
      {[-1, 0, 1].map((x, i) => (
        <Box key={i} args={[0.8, 0.6, 0.1]} position={[x, height * 0.6, depth / 2 + 0.05]}>
          <meshStandardMaterial color="#1e3a5f" metalness={0.9} roughness={0.1} />
        </Box>
      ))}
      
      {/* Door */}
      <Box args={[0.8, 1.2, 0.1]} position={[0, 0.6, depth / 2 + 0.05]}>
        <meshStandardMaterial color={EQUIPMENT_COLORS.steelDark} metalness={0.3} roughness={0.6} />
      </Box>
      
      {/* AC unit on roof */}
      <Box args={[1, 0.5, 0.8]} position={[width / 3, height + 0.35, 0]}>
        <meshStandardMaterial color={EQUIPMENT_COLORS.steel} metalness={0.5} roughness={0.5} />
      </Box>
      
      {/* Label */}
      {data && (
        <Html position={[0, height + 1.5, 0]} center>
          <div style={{
            background: selected ? 'rgba(59, 130, 246, 0.95)' : 'rgba(0,0,0,0.85)',
            color: 'white',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '10px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            textAlign: 'center'
          }}>
            <div style={{ fontWeight: '600' }}>{data.name}</div>
            <div style={{ opacity: 0.8 }}>{data.assetCount} assets</div>
          </div>
        </Html>
      )}
    </group>
  )
}

/**
 * Furnace/Heater - Fired heater unit
 */
export function Furnace({ position = [0, 0, 0], width = 3, height = 4, data, onClick, selected }) {
  return (
    <group position={position} onClick={onClick}>
      {/* Main firebox */}
      <Box args={[width, height, width * 0.8]} position={[0, height / 2, 0]}>
        <meshStandardMaterial 
          color={selected ? '#3b82f6' : '#4a5568'} 
          metalness={0.4} 
          roughness={0.6}
        />
      </Box>
      
      {/* Stack */}
      <Cylinder args={[0.4, 0.5, height * 0.8, 16]} position={[width * 0.3, height + height * 0.4, 0]}>
        <meshStandardMaterial color={EQUIPMENT_COLORS.steelDark} metalness={0.5} roughness={0.5} />
      </Cylinder>
      
      {/* Burner ports (glowing) */}
      {[-0.6, 0, 0.6].map((x, i) => (
        <Box key={i} args={[0.3, 0.4, 0.1]} position={[x, 1, width * 0.4 + 0.05]}>
          <meshStandardMaterial 
            color={EQUIPMENT_COLORS.flame} 
            emissive={EQUIPMENT_COLORS.flame}
            emissiveIntensity={1}
          />
        </Box>
      ))}
      
      {/* Convection section (top) */}
      <Box args={[width * 0.9, height * 0.3, width * 0.7]} position={[0, height * 0.85, 0]}>
        <meshStandardMaterial color={EQUIPMENT_COLORS.steel} metalness={0.5} roughness={0.4} />
      </Box>
      
      {/* Label */}
      {data && (
        <Html position={[0, height * 1.5 + 1, 0]} center>
          <div style={{
            background: selected ? 'rgba(59, 130, 246, 0.95)' : 'rgba(0,0,0,0.85)',
            color: 'white',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '10px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            textAlign: 'center'
          }}>
            <div style={{ fontWeight: '600' }}>{data.name}</div>
            <div style={{ opacity: 0.8 }}>{data.assetCount} assets</div>
          </div>
        </Html>
      )}
    </group>
  )
}

/**
 * Pipe - Connection between equipment
 */
export function Pipe({ start, end, radius = 0.08, color = EQUIPMENT_COLORS.pipe, flowDirection = true }) {
  const points = useMemo(() => {
    const s = new THREE.Vector3(...start)
    const e = new THREE.Vector3(...end)
    return [s, e]
  }, [start, end])
  
  const length = useMemo(() => {
    return new THREE.Vector3(...start).distanceTo(new THREE.Vector3(...end))
  }, [start, end])
  
  const midpoint = useMemo(() => {
    return [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2,
      (start[2] + end[2]) / 2
    ]
  }, [start, end])
  
  const rotation = useMemo(() => {
    const direction = new THREE.Vector3(...end).sub(new THREE.Vector3(...start)).normalize()
    const up = new THREE.Vector3(0, 1, 0)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction)
    const euler = new THREE.Euler().setFromQuaternion(quaternion)
    return [euler.x, euler.y, euler.z]
  }, [start, end])
  
  return (
    <group>
      <Cylinder 
        args={[radius, radius, length, 8]} 
        position={midpoint}
        rotation={rotation}
      >
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
      </Cylinder>
    </group>
  )
}

/**
 * Pump - Small pump unit
 */
export function Pump({ position = [0, 0, 0], data, onClick, selected }) {
  return (
    <group position={position} onClick={onClick}>
      {/* Motor */}
      <Cylinder args={[0.3, 0.3, 0.6, 16]} position={[0, 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial 
          color={selected ? '#3b82f6' : '#10b981'} 
          metalness={0.5} 
          roughness={0.4}
        />
      </Cylinder>
      
      {/* Pump casing */}
      <Cylinder args={[0.25, 0.25, 0.3, 16]} position={[0.4, 0.3, 0]}>
        <meshStandardMaterial color={EQUIPMENT_COLORS.steel} metalness={0.6} roughness={0.3} />
      </Cylinder>
      
      {/* Base */}
      <Box args={[0.8, 0.1, 0.5]} position={[0.1, 0.05, 0]}>
        <meshStandardMaterial color={EQUIPMENT_COLORS.concrete} roughness={0.8} />
      </Box>
      
      {/* Inlet/outlet pipes */}
      <Cylinder args={[0.08, 0.08, 0.3, 8]} position={[0.4, 0.3, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color={EQUIPMENT_COLORS.pipe} metalness={0.6} roughness={0.4} />
      </Cylinder>
      <Cylinder args={[0.08, 0.08, 0.3, 8]} position={[0.65, 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial color={EQUIPMENT_COLORS.pipe} metalness={0.6} roughness={0.4} />
      </Cylinder>
    </group>
  )
}

// Export equipment type mapping for layout system
export const EQUIPMENT_MAP = {
  'Crude Distillation Unit': DistillationColumn,
  'CDU': DistillationColumn,
  'Fluid Catalytic Cracker': { component: Reactor, props: { type: 'drum' } },
  'FCC': { component: Reactor, props: { type: 'drum' } },
  'Hydrocracker': { component: Reactor, props: { type: 'drum' } },
  'Reformer': DistillationColumn,
  'Coker Unit': DistillationColumn,
  'Coker': DistillationColumn,
  'Hydrotreater': { component: HeatExchanger },
  'Tank Farm': StorageTank,
  'Loading Rack': StorageTank,
  'Loading': StorageTank,
  'Utilities': Furnace,
  'Control Room': ControlRoom,
  'Flare System': FlareStack,
  'Wastewater Treatment': StorageTank,
  'default': { component: Reactor, props: { type: 'sphere' } }
}
