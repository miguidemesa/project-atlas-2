import { TILT_MAX_DEG, tiltFor } from "./tilt";

it("lies flat with the thumb in the middle", () => {
  expect(tiltFor(0.5, 0.5)).toEqual({ rotateX: 0, rotateY: 0, foilX: 0, foilY: 0 });
});

it("leans toward the thumb, up to the maximum, with the web's signs", () => {
  expect(tiltFor(0, 0)).toEqual({ rotateX: TILT_MAX_DEG, rotateY: -TILT_MAX_DEG, foilX: -0.5, foilY: -0.5 });
  expect(tiltFor(1, 1)).toEqual({ rotateX: -TILT_MAX_DEG, rotateY: TILT_MAX_DEG, foilX: 0.5, foilY: 0.5 });
});

it("clamps a thumb that slides past the card's edge", () => {
  expect(tiltFor(2, -1)).toEqual(tiltFor(1, 0));
  expect(TILT_MAX_DEG).toBe(6);
});
