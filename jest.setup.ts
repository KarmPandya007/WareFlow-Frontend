import "@testing-library/jest-dom";

jest.mock("next/router", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      pathname: "/",
    };
  },
}));
