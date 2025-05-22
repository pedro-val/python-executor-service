FROM node:18-slim

# Install Python and necessary dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    protobuf-compiler \
    libnl-route-3-dev \
    libtool \
    autoconf \
    pkg-config \
    git \
    libprotobuf-dev \
    bison \
    flex \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install nsjail
WORKDIR /tmp
RUN git clone https://github.com/google/nsjail.git \
    && cd nsjail \
    && make \
    && cp nsjail /usr/local/bin/ \
    && cd .. \
    && rm -rf nsjail

# Create and activate Python virtual environment
RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"

# Install required Python packages in the virtual environment
RUN pip3 install --no-cache-dir --upgrade pip && \
    pip3 install --no-cache-dir pandas numpy

# Set up work directory
WORKDIR /app

# Copy package.json and install Node.js dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application code
COPY src ./src
COPY config ./config

# Create workspace directory for script execution
RUN mkdir -p /app/workspace && chmod 777 /app/workspace

# Expose port 8080
EXPOSE 8080

# Run the service
CMD ["npm", "start"] 