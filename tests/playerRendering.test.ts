import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { applyAnimation, type BoneRefs } from '../src/three/animations';
import { getMatchCameraPose } from '../src/three/matchCamera';
import { CAREER_PLAYER_SCALE, LIVE_PLAYER_SCALE } from '../src/three/playerPresentation';

function ref(group: THREE.Group) {
  return { current: group };
}

function makeBones(): BoneRefs {
  return {
    root: ref(new THREE.Group()),
    torso: ref(new THREE.Group()),
    head: ref(new THREE.Group()),
    leftArm: ref(new THREE.Group()),
    leftElbow: ref(new THREE.Group()),
    rightArm: ref(new THREE.Group()),
    rightElbow: ref(new THREE.Group()),
    leftLeg: ref(new THREE.Group()),
    leftKnee: ref(new THREE.Group()),
    rightLeg: ref(new THREE.Group()),
    rightKnee: ref(new THREE.Group()),
  };
}

test('animation changes clear transforms left behind by the previous action', () => {
  const bones = makeBones();
  applyAnimation(bones, 'tackle', 0.2);
  applyAnimation(bones, 'run', 0.4);

  assert.equal(bones.torso.current?.rotation.y, 0);
  assert.equal(bones.leftArm.current?.rotation.y, 0);
  assert.equal(bones.leftArm.current?.rotation.z, 0);
  assert.equal(bones.rightArm.current?.rotation.y, 0);
  assert.equal(bones.rightArm.current?.rotation.z, 0);
  assert.equal(bones.torso.current?.scale.x, 1);
  assert.equal(bones.torso.current?.scale.y, 1);
  assert.equal(bones.root.current?.rotation.x, 0);
  assert.equal(bones.root.current?.rotation.y, 0);
  assert.equal(bones.root.current?.rotation.z, 0);
});

test('portrait broadcast camera backs away and looks down on the playfield', () => {
  const focus = { x: 0.2, y: 0.03, z: 0.5 };
  const portrait = getMatchCameraPose('broadcast', 0.46, focus);
  const landscape = getMatchCameraPose('broadcast', 1.6, focus);

  assert.ok(portrait.position.y > landscape.position.y + 1.4);
  assert.ok(portrait.position.x > landscape.position.x + 0.7);
  assert.ok(Math.abs(portrait.lookAt.x) < Math.abs(landscape.lookAt.x) + 0.1);
  assert.ok(portrait.lookAt.y <= 0.12);
});

test('player presentation scales keep live players proportional to the pitch', () => {
  assert.ok(LIVE_PLAYER_SCALE >= 0.18 && LIVE_PLAYER_SCALE <= 0.24);
  assert.ok(CAREER_PLAYER_SCALE >= 0.9 && CAREER_PLAYER_SCALE <= 1.15);
});
