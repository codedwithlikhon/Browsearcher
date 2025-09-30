# Gemini Multi-Agent AI System - Complete Architecture Documentation

## Executive Summary

Gemini is a sophisticated multi-agent AI system that coordinates multiple specialized AI models to accomplish complex tasks through a plan-act orchestration framework. The system divides work among specialist agents (data acquisition, code generation, report writing, web deployment) working collaboratively under a central orchestrator, similar to a team of experts led by a project manager.

## System Architecture Overview

### Core Design Principles

1. **Multi-Agent Coordination**: Multiple specialized AI agents work together, each focusing on specific capabilities
1. **Isolated Execution**: All potentially risky operations occur in containerized sandbox environments
1. **Transparency**: Users can observe agent actions through multiple viewing interfaces
1. **Tool Integration**: Agents leverage various tools (browser automation, web search, file handling, shell access) to accomplish tasks
1. **Real-time Streaming**: Results are progressively delivered to users as they’re generated

-----

## Complete Directory Structure

```


├── frontend/                          # Frontend application
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   │   ├── ChatInterface.tsx         # Main chat UI component
│   │   │   │   ├── MessageList.tsx           # Chat message display
│   │   │   │   ├── InputBox.tsx              # User input component
│   │   │   │   └── StreamHandler.ts          # SSE stream processing
│   │   │   │
│   │   │   ├── tools/
│   │   │   │   ├── ToolView.tsx              # Tool usage visualization
│   │   │   │   ├── ToolCard.tsx              # Individual tool display
│   │   │   │   └── ToolTimeline.tsx          # Sequential tool execution view
│   │   │   │
│   │   │   └── remote/
│   │   │       ├── NoVNCViewer.tsx           # Remote desktop interface
│   │   │       ├── VNCConnection.ts          # WebSocket VNC handler
│   │   │       └── DisplayControls.tsx       # View controls (zoom, quality)
│   │   │
│   │   ├── services/
│   │   │   ├── api.ts                        # Backend API client
│   │   │   ├── websocket.ts                  # WebSocket connection manager
│   │   │   └── auth.ts                       # Authentication service
│   │   │
│   │   ├── App.tsx                           # Root application component
│   │   └── index.tsx                         # Application entry point
│   │
│   ├── public/
│   │   ├── index.html
│   │   └── assets/
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── railway.json                          # Railway deployment config
│
├── backend/                           # Backend server
│   ├── src/
│   │   ├── orchestration/
│   │   │   ├── controller.py                 # Main plan-act orchestrator
│   │   │   ├── agent_manager.py              # Multi-agent coordination
│   │   │   ├── task_planner.py               # Task decomposition logic
│   │   │   └── execution_engine.py           # Action execution manager
│   │   │
│   │   ├── agents/
│   │   │   ├── base_agent.py                 # Abstract agent class
│   │   │   ├── data_acquisition_agent.py     # Data gathering specialist
│   │   │   ├── code_generation_agent.py      # Code writing specialist
│   │   │   ├── report_writing_agent.py       # Document synthesis specialist
│   │   │   └── web_deployment_agent.py       # Deployment specialist
│   │   │
│   │   ├── tools/
│   │   │   ├── browser_automation.py         # Chrome CDP automation
│   │   │   ├── web_search.py                 # Google Search API integration
│   │   │   ├── file_handler.py               # File read/write operations
│   │   │   ├── shell_executor.py             # Command execution in sandbox
│   │   │   └── messaging.py                  # External notifications
│   │   │
│   │   ├── integrations/
│   │   │   ├── openai_client.py              # OpenAI SDK integration
│   │   │   ├── google_search.py              # Search API client
│   │   │   └── docker_manager.py             # Docker container control
│   │   │
│   │   ├── api/
│   │   │   ├── server.py                     # FastAPI/Flask server
│   │   │   ├── routes.py                     # API endpoint definitions
│   │   │   ├── sse_handler.py                # Server-Sent Events streaming
│   │   │   └── auth_middleware.py            # Authentication middleware
│   │   │
│   │   ├── sandbox/
│   │   │   ├── sandbox_controller.py         # Sandbox lifecycle management
│   │   │   ├── cdp_client.py                 # Chrome DevTools Protocol client
│   │   │   └── vnc_proxy.py                  # VNC connection proxy
│   │   │
│   │   └── utils/
│   │       ├── prompt_templates.py           # Agent prompt engineering
│   │       ├── parser.py                     # Response parsing utilities
│   │       └── logger.py                     # Logging configuration
│   │
│   ├── config/
│   │   ├── settings.py                       # Application configuration
│   │   └── agents_config.yaml                # Agent definitions and roles
│   │
│   ├── requirements.txt
│   ├── Dockerfile
│   └── railway.toml                          # Railway deployment config
│
├── sandbox/                           # Execution sandbox environment
│   ├── docker/
│   │   ├── Dockerfile                        # Ubuntu container definition
│   │   ├── supervisord.conf                  # Supervisor process config
│   │   └── entrypoint.sh                     # Container startup script
│   │
│   ├── services/
│   │   ├── chrome/
│   │   │   ├── chrome_launcher.sh            # Chrome startup with CDP
│   │   │   └── chrome_flags.conf             # Chrome configuration
│   │   │
│   │   ├── vnc/
│   │   │   ├── start_xvfb.sh                 # Virtual display setup
│   │   │   ├── start_x11vnc.sh               # VNC server startup
│   │   │   └── vnc_password                  # VNC authentication
│   │   │
│   │   └── shell/
│   │       └── shell_server.py               # Shell command API
│   │
│   ├── workspace/                            # Agent working directory
│   │   ├── scripts/                          # Generated scripts
│   │   ├── data/                             # Data files
│   │   └── output/                           # Result files
│   │
│   └── railway.json                          # Railway deployment config
│
├── infrastructure/                    # Shared infrastructure
│   ├── docker-compose.yml                    # Local development setup
│   ├── docker-compose.prod.yml               # Production configuration
│   │
│   ├── networking/
│   │   ├── nginx.conf                        # Reverse proxy config
│   │   └── ssl/                              # SSL certificates
│   │
│   └── monitoring/
│       ├── prometheus.yml                    # Metrics collection
│       └── grafana/                          # Dashboards
│
├── templates/                         # Railway templates
│   ├── template.json                         # Template manifest
│   ├── README.md                             # Template documentation
│   └── services/
│       ├── frontend.json                     # Frontend service definition
│       ├── backend.json                      # Backend service definition
│       └── sandbox.json                      # Sandbox service definition
│
├── docs/                              # Documentation
│   ├── architecture.md                       # Architecture overview (this document)
│   ├── api/
│   │   ├── endpoints.md                      # API documentation
│   │   └── websocket.md                      # WebSocket protocols
│   │
│   ├── agents/
│   │   ├── creating_agents.md                # Guide to building agents
│   │   ├── prompt_engineering.md             # Prompting best practices
│   │   └── tool_integration.md               # Adding new tools
│   │
│   ├── deployment/
│   │   ├── railway_setup.md                  # Railway deployment guide
│   │   ├── docker_setup.md                   # Docker configuration
│   │   └── security.md                       # Security considerations
│   │
│   └── user_guide/
│       ├── getting_started.md                # Quick start guide
│       └── advanced_usage.md                 # Advanced features
│
├── tests/                             # Test suites
│   ├── frontend/
│   │   ├── unit/
│   │   └── integration/
│   │
│   ├── backend/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   │
│   └── sandbox/
│       └── integration/
│
├── scripts/                           # Utility scripts
│   ├── setup_dev.sh                          # Development environment setup
│   ├── deploy.sh                             # Deployment automation
│   ├── test_all.sh                           # Run all tests
│   └── cleanup.sh                            # Resource cleanup
│
├── .github/                           # GitHub configuration
│   └── workflows/
│       ├── ci.yml                            # Continuous integration
│       └── deploy.yml                        # Deployment workflow
│
├── .env.example                              # Environment variables template
├── .gitignore
├── LICENSE
└── README.md                                 # Project overview
```

-----

## Detailed Component Architecture

### 1. Frontend Layer (`/frontend`)

#### 1.1 Chat Interface

**Path**: `/frontend/src/components/chat/`

The primary user interaction point. Handles:

- User message input and validation
- Message history display with streaming support
- SSE connection management for real-time responses
- Markdown rendering for formatted responses
- Error handling and retry logic

**Key Files**:

- `ChatInterface.tsx` - Main container component
- `StreamHandler.ts` - Processes SSE events from backend
- `MessageList.tsx` - Renders conversation history with auto-scroll

#### 1.2 Tool View Interface

**Path**: `/frontend/src/components/tools/`

Visualizes agent tool usage for transparency:

- Displays which tools agents are invoking
- Shows intermediate results and outputs
- Timeline view of sequential tool executions
- Collapsible detail views for each tool invocation

**Key Files**:

- `ToolView.tsx` - Container managing tool state
- `ToolCard.tsx` - Individual tool result display
- `ToolTimeline.tsx` - Sequential execution visualization

#### 1.3 noVNC Remote Desktop

**Path**: `/frontend/src/components/remote/`

Real-time view into sandbox GUI:

- WebSocket connection to sandbox VNC server
- Interactive desktop viewer with mouse/keyboard input
- Display quality and scaling controls
- Fullscreen mode support

**Key Files**:

- `NoVNCViewer.tsx` - VNC canvas component
- `VNCConnection.ts` - WebSocket management and protocol handling
- `DisplayControls.tsx` - User controls for view customization

-----

### 2. Backend Layer (`/backend`)

#### 2.1 Orchestration System

**Path**: `/backend/src/orchestration/`

The brain of Gemini - coordinates all agent activities:

**Plan-Act Controller** (`controller.py`):

- Receives user requests from API
- Decomposes tasks into subtasks
- Maintains execution state and context
- Iteratively plans next steps based on previous results
- Assembles final responses

**Agent Manager** (`agent_manager.py`):

- Instantiates and coordinates specialized agents
- Routes subtasks to appropriate agents
- Manages agent lifecycle and context passing
- Handles agent failures and fallbacks

**Task Planner** (`task_planner.py`):

- Analyzes user requests to determine required steps
- Identifies dependencies between subtasks
- Optimizes execution order
- Estimates resource requirements

**Execution Engine** (`execution_engine.py`):

- Executes planned actions through tools
- Manages tool invocation queue
- Handles timeouts and retries
- Collects and aggregates results

#### 2.2 Specialized Agents

**Path**: `/backend/src/agents/`

Each agent is a specialized AI with specific responsibilities:

**Data Acquisition Agent** (`data_acquisition_agent.py`):

- Gathers information from web searches, APIs, uploaded files
- Validates and structures collected data
- Handles various data formats (CSV, JSON, XML, etc.)
- Cross-references multiple sources

**Code Generation Agent** (`code_generation_agent.py`):

- Writes functional code in multiple languages
- Tests and debugs generated code
- Optimizes for performance and readability
- Generates documentation and comments

**Report Writing Agent** (`report_writing_agent.py`):

- Synthesizes findings into coherent narratives
- Structures documents with appropriate formatting
- Creates summaries, spreadsheets, presentations
- Adapts tone and style to audience

**Web Deployment Agent** (`web_deployment_agent.py`):

- Creates deployable web applications
- Configures dashboards and interactive tools
- Handles hosting and domain setup
- Ensures responsive design and accessibility

#### 2.3 Tool Integration Layer

**Path**: `/backend/src/tools/`

Extensible toolkit for agent capabilities:

**Browser Automation** (`browser_automation.py`):

- Controls Chrome via CDP WebSocket
- Navigates pages, clicks elements, fills forms
- Extracts content and takes screenshots
- Handles authentication and cookies

**Web Search** (`web_search.py`):

- Interfaces with Google Search API
- Formulates effective search queries
- Parses and ranks results
- Handles rate limiting and errors

**File Handler** (`file_handler.py`):

- Reads/writes files in sandbox
- Handles multiple formats (text, binary, compressed)
- Manages file permissions and security
- Provides streaming for large files

**Shell Executor** (`shell_executor.py`):

- Executes commands in sandbox shell
- Captures stdout/stderr streams
- Manages timeouts and resource limits
- Sanitizes potentially dangerous commands

#### 2.4 LLM Integration

**Path**: `/backend/src/integrations/openai_client.py`

Connects to OpenAI API for reasoning:

- Manages API authentication and rate limits
- Implements retry logic with exponential backoff
- Handles prompt construction and response parsing
- Supports streaming responses
- Tracks token usage and costs

**Prompt Engineering**:
Located in `/backend/src/utils/prompt_templates.py`:

- Specialized prompts for each agent type
- Few-shot examples for better performance
- Context window management strategies
- Output format specifications

#### 2.5 API Server

**Path**: `/backend/src/api/`

Exposes Gemini capabilities via REST and WebSocket:

**REST Endpoints** (`routes.py`):

- `POST /chat` - Submit user query
- `GET /status` - Check system health
- `POST /upload` - Upload files for analysis
- `GET /results/:id` - Retrieve task results

**Server-Sent Events** (`sse_handler.py`):

- Streams partial responses to frontend
- Sends tool usage updates in real-time
- Handles connection lifecycle
- Implements heartbeat for connection health

**WebSocket Endpoints**:

- `/ws/vnc` - VNC proxy to sandbox
- `/ws/cdp` - Chrome DevTools Protocol proxy

-----

### 3. Sandbox Layer (`/sandbox`)

#### 3.1 Containerization

**Path**: `/sandbox/docker/`

Ubuntu-based Docker container for isolated execution:

**Dockerfile**:

```dockerfile
FROM ubuntu:22.04

# Install essential packages
RUN apt-get update && apt-get install -y \
    chromium-browser \
    supervisor \
    xvfb \
    x11vnc \
    python3 \
    python3-pip \
    nodejs \
    npm

# Configure virtual display
ENV DISPLAY=:99

# Set up supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create workspace
RUN mkdir -p /workspace/{scripts,data,output}

EXPOSE 9222 5900

CMD ["/usr/bin/supervisord"]
```

**Supervisor Configuration** (`supervisord.conf`):
Manages all sandbox processes:

```ini
[program:xvfb]
command=/usr/bin/Xvfb :99 -screen 0 1920x1080x24
autorestart=true

[program:x11vnc]
command=/usr/bin/x11vnc -display :99 -forever -shared
autorestart=true

[program:chrome]
command=/usr/bin/chromium-browser --remote-debugging-port=9222 --no-sandbox
autorestart=true
```

#### 3.2 Chrome Browser Service

**Path**: `/sandbox/services/chrome/`

Headless Chrome with remote debugging:

- Launched with CDP enabled on port 9222
- Runs with necessary security flags for containerized environment
- Configured with custom user data directory
- Supports file downloads to workspace

#### 3.3 VNC Service

**Path**: `/sandbox/services/vnc/`

Remote desktop access:

- Xvfb creates virtual display (:99)
- x11vnc shares the display over port 5900
- Optional password authentication
- Supports multiple concurrent viewers

#### 3.4 Workspace

**Path**: `/sandbox/workspace/`

Isolated file system for agent operations:

- `/scripts/` - Agent-generated code
- `/data/` - Input files and datasets
- `/output/` - Results and artifacts
- Mounted volumes for persistence if needed

-----

### 4. Infrastructure Layer

#### 4.1 Communication Protocols

**HTTP/REST**:

- Request/response for stateless operations
- JWT authentication for API access
- CORS configuration for frontend access

**Server-Sent Events (SSE)**:

- One-way streaming from server to client
- Used for chat response streaming
- Automatic reconnection on disconnect

**WebSocket**:

- Full-duplex communication
- Used for: noVNC remote desktop, Chrome CDP control
- Ping/pong heartbeat for connection health

**Chrome DevTools Protocol (CDP)**:

- JSON-RPC over WebSocket
- Commands: `Page.navigate`, `Runtime.evaluate`, `DOM.getDocument`
- Events: `Page.loadEventFired`, `Console.messageAdded`

#### 4.2 Docker Networking

**Network Architecture**:

```yaml
networks:
  gemini-network:
    driver: bridge

services:
  frontend:
    networks:
      - gemini-network
    ports:
      - "3000:3000"

  backend:
    networks:
      - gemini-network
    ports:
      - "8000:8000"

  sandbox:
    networks:
      - gemini-network
    ports:
      - "9222:9222"  # Chrome CDP
      - "5900:5900"  # VNC
```

#### 4.3 Security Considerations

**Sandbox Isolation**:

- No direct internet access (proxied through backend)
- Limited CPU/memory resources
- No access to host filesystem
- Non-root user execution

**API Security**:

- Rate limiting on endpoints
- Input validation and sanitization
- CSRF protection
- Content Security Policy headers

**Secrets Management**:

- Environment variables for sensitive config
- Never commit API keys to repository
- Rotate credentials regularly

-----

## Railway Deployment Configuration

### Multi-Service Template Structure

**Root Template** (`/templates/template.json`):

```json
{
  "name": "Gemini Multi-Agent AI System",
  "description": "Deploy a complete multi-agent AI system with isolated execution",
  "services": [
    {
      "name": "frontend",
      "source": {
        "repo": "your-repo",
        "directory": "frontend"
      },
      "railwayJson": "frontend/railway.json"
    },
    {
      "name": "backend",
      "source": {
        "repo": "your-repo",
        "directory": "backend"
      },
      "railwayToml": "backend/railway.toml"
    },
    {
      "name": "sandbox",
      "source": {
        "repo": "your-repo",
        "directory": "sandbox"
      },
      "railwayJson": "sandbox/railway.json"
    }
  ],
  "variables": [
    {
      "name": "OPENAI_API_KEY",
      "description": "OpenAI API key for LLM access"
    },
    {
      "name": "GOOGLE_SEARCH_API_KEY",
      "description": "Google Search API key"
    }
  ]
}
```

**Frontend Config** (`/frontend/railway.json`):

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

**Backend Config** (`/backend/railway.toml`):

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "python src/api/server.py"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[[deploy.healthcheck]]
path = "/health"
interval = 30
timeout = 10
```

**Sandbox Config** (`/sandbox/railway.json`):

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "docker/Dockerfile"
  },
  "deploy": {
    "startCommand": "/usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf"
  }
}
```

-----

## Data Flow Diagrams

### User Query Flow

```
User Input → Frontend Chat
    ↓ HTTP POST
Backend API Server
    ↓
Orchestration Controller
    ↓ (analyzes request)
Task Planner (breaks down task)
    ↓
Agent Manager (assigns to specialist)
    ↓
[Data Agent | Code Agent | Report Agent | Deploy Agent]
    ↓ (uses tools)
[Browser | Search | Files | Shell]
    ↓ (via Docker/WebSocket)
Sandbox Ubuntu Container
    ↓ (executes actions)
Results → Orchestrator
    ↓ SSE Stream
Frontend (displays progressively)
```

### Browser Automation Flow

```
Agent decides to browse web
    ↓
Orchestrator → Browser Tool
    ↓ WebSocket
Chrome CDP Client (backend)
    ↓ WebSocket to port 9222
Chrome in Sandbox
    ↓ (navigates page)
Page content extracted
    ↓ CDP Response
Backend receives HTML/data
    ↓
Agent processes content
    ↓
Result incorporated into plan
```

### VNC Streaming Flow

```
User opens noVNC viewer (frontend)
    ↓ WebSocket
Backend VNC Proxy
    ↓ WebSocket Forward
x11vnc in Sandbox
    ↓ (captures Xvfb display)
VNC frames stream back
    ↓
Frontend renders desktop view
```

-----

## Extending the System

### Adding New Agents

1. Create agent class in `/backend/src/agents/new_agent.py`:

```python
from agents.base_agent import BaseAgent

class NewAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="new_agent",
            description="Specialized agent for X"
        )

    def plan(self, task):
        # Decompose task into steps
        pass

    def execute(self, step):
        # Execute individual step
        pass
```

1. Register in Agent Manager (`agent_manager.py`)
1. Add prompt template in `prompt_templates.py`
1. Update documentation

### Adding New Tools

1. Create tool in `/backend/src/tools/new_tool.py`:

```python
from tools.base_tool import BaseTool

class NewTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="new_tool",
            description="Tool for Y"
        )

    def execute(self, params):
        # Tool implementation
        pass
```

1. Register in Tools Integration Layer
1. Update agent prompts to reference new tool
1. Add tool view component in frontend if needed

-----

## Best Practices

### For Development

1. **Always test in sandbox first** - Never run untrusted code outside containers
1. **Use type hints** - Python type annotations help catch errors
1. **Log extensively** - Multi-agent debugging requires detailed logs
1. **Version prompts** - Track prompt changes like code changes
1. **Monitor token usage** - LLM calls can be expensive

### For Deployment

1. **Set resource limits** - Prevent runaway processes
1. **Implement timeouts** - All operations should have max duration
1. **Use health checks** - Monitor service availability
1. **Enable metrics** - Track performance and usage
1. **Plan for scale** - Design for horizontal scaling from day one

### For Templates

1. **Clear documentation** - README with setup instructions
1. **Sensible defaults** - Work out-of-the-box when possible
1. **Environment variables** - All config via env vars
1. **Minimal dependencies** - Reduce deployment complexity
1. **Quick start guide** - Get users productive in minutes

-----

## Kickback Program Participation

Templates deployed from Railway’s marketplace earn 50% kickback on usage:

1. **Build template** following structure above
1. **Publish to marketplace** via Railway dashboard
1. **Automatic tracking** of deployments from your template
1. **Monthly payouts** based on usage generated
1. **Community benefits** as others use and improve your template

-----

## Conclusion

The Gemini Multi-Agent AI System represents a sophisticated approach to AI orchestration, combining specialized agents, tool integration, and isolated execution environments. This architecture enables complex task completion while maintaining security, transparency, and extensibility.

The three-tier structure (Frontend → Backend → Sandbox) provides clear separation of concerns, while the multi-agent design allows for specialized capabilities that can evolve independently. The Railway deployment configuration makes the entire system reproducible and shareable as a template.

For questions, contributions, or support, please refer to the documentation in `/docs` or open an issue in the repository.