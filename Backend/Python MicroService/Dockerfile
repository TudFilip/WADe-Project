# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . .

# Install any needed packages
RUN pip install --no-cache-dir -r requirements.txt

# Expose port 5000 (default Flask port)
EXPOSE 5000

# Set environment variables (optional if using .env)
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0

# Run the application
CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]
