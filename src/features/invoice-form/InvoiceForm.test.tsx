import React from "react";
import {  screen, fireEvent } from "@testing-library/react";
import InvoiceForm from "./InvoiceForm";
import { render, waitFor, act } from "@testing-library/react";


// ---- Mock all heavy external dependencies ---- //
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

jest.mock("@/components/Navbar", () => () => <div data-testid="mock-navbar">Mock Navbar</div>);
jest.mock("qrcode", () => ({
  toDataURL: jest.fn().mockResolvedValue("data:image/png;base64,mockqr"),
}));

jest.mock("@/lib/api", () => ({
  getApiUrl: () => "http://localhost:4000",
}));

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        success: true,
        branches: [{ _id: "1", name: "Main Branch", code: "MB" }],
      }),
  })
) as jest.Mock;

// Mock browser APIs that Next.js expects
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    matches: false,
    addListener: jest.fn(),
    removeListener: jest.fn(),
  })),
});

describe("InvoiceForm Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("renders without crashing", async () => {
    render(<InvoiceForm />);
    expect(screen.getByTestId("mock-navbar")).toBeInTheDocument();
    expect(screen.getByText(/Create Invoice/i)).toBeInTheDocument();
    expect(await screen.findByText(/GST Billing Details/i)).toBeInTheDocument();
  });

  it("shows the submit button", () => {
    render(<InvoiceForm />);
    const submitButton = screen.getByRole("button", { name: /submit invoice/i });
    expect(submitButton).toBeInTheDocument();
  });

  it("allows entering company and customer name", () => {
    render(<InvoiceForm />);
    const companyInput = screen.getByPlaceholderText(/company name/i);
    const customerInput = screen.getByPlaceholderText(/enter customer name/i);

    fireEvent.change(companyInput, { target: { value: "HP Computers" } });
    fireEvent.change(customerInput, { target: { value: "Rohan Kumar" } });

    expect((companyInput as HTMLInputElement).value).toBe("HP Computers");
    expect((customerInput as HTMLInputElement).value).toBe("Rohan Kumar");
  });

  it("renders payment mode radio buttons", () => {
    render(<InvoiceForm />);
    expect(screen.getByLabelText(/cash/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/upi/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/card/i)).toBeInTheDocument();
  });
});

describe("InvoiceForm validation behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    // Mock fetch for branches
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes("/api/branches")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            branches: [{ _id: "1", name: "Main Branch", code: "MB" }],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });
  });

  it("shows an alert if required fields are missing on submit", async () => {
    const alertMock = jest.spyOn(window, "alert").mockImplementation(() => {});

    render(<InvoiceForm />);

    // Wait for component to mount properly
    await waitFor(() => screen.getByText(/create invoice/i));

    // Click Submit without filling anything
    const submitButton = screen.getByRole("button", { name: /submit invoice/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        expect.stringMatching(/please fill in all required fields/i)
      );
    });

    alertMock.mockRestore();
  });
});



describe("InvoiceForm product management behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes("/api/branches")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            branches: [{ _id: "1", name: "Main Branch", code: "MB" }],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  it("adds a new product section when '+ Add Product' is clicked", async () => {
    render(<InvoiceForm />);

    // Wait for the initial product section to render
    await waitFor(() => screen.getByText(/product 1/i));

    const addButton = screen.getByRole("button", { name: /\+ add product/i });
    fireEvent.click(addButton);

    // After clicking, there should now be 2 product sections
    await waitFor(() => {
      const productSections = screen.getAllByText(/product/i);
      expect(productSections.length).toBeGreaterThanOrEqual(2);
    });
  });
});


it("handles branch fetch failure gracefully", async () => {
  (global.fetch as jest.Mock).mockImplementationOnce(() =>
    Promise.resolve({ ok: false, status: 500 })
  );

  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  render(<InvoiceForm />);

  await waitFor(() => {
    expect(consoleSpy).toHaveBeenCalled();
    // Check that the first argument of any call contains the error message
    const firstArg = consoleSpy.mock.calls[0][0];
    expect(firstArg).toMatch(/error fetching branches/i);
  });

  consoleSpy.mockRestore();
});




it("opens and closes the custom field modal", async () => {
  render(<InvoiceForm />);

  const addButton = await screen.findByRole("button", { name: /\+ add custom field/i });
  fireEvent.click(addButton);

  expect(screen.getByText(/add custom attachment field/i)).toBeInTheDocument();

  const cancelButton = screen.getByRole("button", { name: /cancel/i });
  fireEvent.click(cancelButton);

  await waitFor(() => {
    expect(screen.queryByText(/add custom attachment field/i)).not.toBeInTheDocument();
  });
});
