import tkinter as tk
from tkinter import messagebox

def login():
    email = email_entry.get()
    password = password_entry.get()
    if email == "student@cput.ac.za" and password == "1234":
        messagebox.showinfo("Login Success", "Welcome to ShuttleTracker!")
    else:
        messagebox.showerror("Login Failed", "Invalid email or password")

# Create main window
root = tk.Tk()
root.title("ShuttleTracker Login")
root.geometry("300x200")

# Email field
tk.Label(root, text="Email").pack(pady=5)
email_entry = tk.Entry(root, width=25)
email_entry.pack()

# Password field
tk.Label(root, text="Password").pack(pady=5)
password_entry = tk.Entry(root, width=25, show="*")
password_entry.pack()

# Login button
tk.Button(root, text="LOG IN", bg="#003366", fg="white", command=login).pack(pady=10)

# Sign up link
tk.Label(root, text="Don't have an account? Sign Up", fg="blue").pack()

root.mainloop()
