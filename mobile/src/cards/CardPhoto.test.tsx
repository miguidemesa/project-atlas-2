import { render, screen } from "@testing-library/react-native";
import { CardPhoto } from "./CardPhoto";

let mockReduceMotion = false;
jest.mock("@/motion/useReduceMotion", () => ({ useReduceMotion: () => mockReduceMotion }));
// expo-image as a plain view, so the test sees exactly the props CardPhoto hands it.
jest.mock("expo-image", () => {
  const { createElement } = require("react");
  const { View } = require("react-native");
  return { Image: (props: object) => createElement(View, props) };
});

beforeEach(() => {
  mockReduceMotion = false;
});

const PHOTO = "https://cdn.atlas.ph/uploads/mew.jpg";

it("shows the seller's photo exactly as uploaded: whole, unfiltered, untinted", async () => {
  await render(<CardPhoto uri={PHOTO} tier="foil" width={72} label="Mew ex SIR" />);

  const image = screen.getByTestId("card-photo-image");
  expect(image.props.source).toEqual({ uri: PHOTO });
  expect(image.props.contentFit).toBe("contain");
  for (const prop of ["tintColor", "blurRadius"]) expect(image.props[prop]).toBeUndefined();
  expect(screen.getByLabelText("Mew ex SIR")).toBeOnTheScreen();
});

it("says so when a listing has no photo, instead of drawing one", async () => {
  await render(<CardPhoto uri={null} tier="standard" width={72} label="Mew ex SIR" />);

  expect(screen.getByLabelText("Mew ex SIR, no photo")).toBeOnTheScreen();
  expect(screen.queryByTestId("card-photo-image")).toBeNull();
});

it("only mounts the foil on a card you can tilt", async () => {
  await render(<CardPhoto uri={PHOTO} tier="premium" width={200} label="Mew ex SIR" />);
  expect(screen.queryByTestId("card-foil")).toBeNull();

  await screen.rerender(<CardPhoto uri={PHOTO} tier="premium" width={200} label="Mew ex SIR" tilt="free" />);
  expect(screen.getByTestId("card-foil")).toBeOnTheScreen();
});

it("drops the tilt and the foil under Reduce Motion", async () => {
  mockReduceMotion = true;
  await render(<CardPhoto uri={PHOTO} tier="premium" width={200} label="Mew ex SIR" tilt="free" />);
  expect(screen.queryByTestId("card-foil")).toBeNull();
});
