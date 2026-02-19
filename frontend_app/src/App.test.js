import { fireEvent, render, screen } from "@testing-library/react";
import App from "./App";

function setStoredTasks(tasks) {
  window.localStorage.setItem("kavia.todo.tasks.v1", JSON.stringify(tasks));
}

describe("To-do app", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("adds a task and shows it in the list", () => {
    render(<App />);

    const input = screen.getByLabelText(/add a task/i);
    fireEvent.change(input, { target: { value: "Buy milk" } });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));

    expect(screen.getByText("Buy milk")).toBeInTheDocument();
    expect(screen.getByText(/1 active/i)).toBeInTheDocument();
  });

  test("can complete a task and filter completed", () => {
    render(<App />);

    const input = screen.getByLabelText(/add a task/i);
    fireEvent.change(input, { target: { value: "Walk dog" } });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));

    // Toggle completion via checkbox
    const checkbox = screen.getByRole("checkbox", {
      name: /mark "walk dog" as completed/i,
    });
    fireEvent.click(checkbox);

    fireEvent.click(screen.getByRole("button", { name: /completed/i }));

    expect(screen.getByText("Walk dog")).toBeInTheDocument();
    expect(screen.getByText(/0 active/i)).toBeInTheDocument();
    expect(screen.getByText(/1 done/i)).toBeInTheDocument();
  });

  test("loads tasks from localStorage on refresh", () => {
    setStoredTasks([
      {
        id: "t1",
        title: "Persisted task",
        completed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);

    render(<App />);
    expect(screen.getByText("Persisted task")).toBeInTheDocument();
  });
});
