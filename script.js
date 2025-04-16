// Global variables
const components = {
  video: { icon: '🎥', name: 'Video Lesson', configOptions: ['Title', 'URL', 'Duration'] },
  quiz: { icon: '❓', name: 'Quiz', configOptions: ['Title', 'Questions', 'Time Limit'] },
  text: { icon: '📝', name: 'Text Content', configOptions: ['Title', 'Content'] },
  code: { icon: '💻', name: 'Code Playground', configOptions: ['Language', 'Starting Code', 'Instructions'] },
  diagram: { icon: '📊', name: 'Interactive Diagram', configOptions: ['Title', 'Image URL', 'Hotspots'] }
};

let currentDraggedElement = null;
let projectData = {
  left: [],
  right: []
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  initializeToolbox();
  initializeDragAndDrop();
  initializeChatbot();
  
  // Add mode toggle button to header
  const header = document.querySelector('.page-header');
  const toggleButton = document.createElement('button');
  toggleButton.textContent = 'Switch to Preview Mode';
  toggleButton.className = 'mode-toggle';
  toggleButton.onclick = toggleMode;
  header.appendChild(toggleButton);
  
  // Load from localStorage if available
  loadFromStorage();
});

// Initialize the toolbox with educational components
function initializeToolbox() {
  const toolbox = document.querySelector('.toolbox');
  
  // Clear existing tools
  while (toolbox.children.length > 1) {
    if (toolbox.lastChild.tagName !== 'H2') {
      toolbox.removeChild(toolbox.lastChild);
    }
  }
  
  // Add component types
  Object.keys(components).forEach(componentType => {
    const component = components[componentType];
    const element = document.createElement('div');
    element.className = 'draggable';
    element.draggable = true;
    element.id = componentType;
    element.innerHTML = `${component.icon} ${component.name}`;
    
    element.addEventListener('dragstart', handleDragStart);
    toolbox.appendChild(element);
  });
}

// Set up drag and drop event listeners
function initializeDragAndDrop() {
  const containers = document.querySelectorAll('.container');
  
  containers.forEach(container => {
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('dragleave', handleDragLeave);
    container.addEventListener('drop', handleDrop);
  });
}

// Drag event handlers
function handleDragStart(e) {
  currentDraggedElement = e.target;
  e.dataTransfer.setData('text/plain', e.target.id);
  e.target.classList.add('dragging');
  
  // If this is a component already in a container (not from toolbox)
  if (e.target.classList.contains('component')) {
    e.dataTransfer.setData('source-container', e.target.parentElement.id);
    e.dataTransfer.setData('component-id', e.target.dataset.id);
  }
}

function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  
  const componentType = e.dataTransfer.getData('text/plain');
  const sourceContainerId = e.dataTransfer.getData('source-container');
  const componentId = e.dataTransfer.getData('component-id');
  
  // If moving an existing component
  if (sourceContainerId) {
    moveComponent(componentId, sourceContainerId, e.currentTarget.id);
    return;
  }
  
  // If creating a new component from toolbox
  if (components[componentType]) {
    createComponent(componentType, e.currentTarget);
  }
  
  saveToStorage();
}

// Create a new component in the target container
function createComponent(type, container) {
  const component = components[type];
  const id = `${type}-${Date.now()}`;
  
  const element = document.createElement('div');
  element.className = 'component';
  element.draggable = true;
  element.dataset.type = type;
  element.dataset.id = id;
  
  element.innerHTML = `
    <div class="component-header">
      <span class="component-icon">${component.icon}</span>
      <span class="component-title">${component.name}</span>
      <div class="component-actions">
        <button class="config-btn">⚙️</button>
        <button class="delete-btn">❌</button>
      </div>
    </div>
    <div class="component-content"></div>
  `;
  
  element.addEventListener('dragstart', handleDragStart);
  
  // Add event listeners for configuration and deletion
  element.querySelector('.config-btn').addEventListener('click', () => configureComponent(id, type));
  element.querySelector('.delete-btn').addEventListener('click', () => deleteComponent(id, container.id));
  
  container.appendChild(element);
  
  // Add to project data
  const componentData = {
    id,
    type,
    configuration: {}
  };
  
  projectData[container.id].push(componentData);
  
  // Open configuration dialog automatically for new components
  configureComponent(id, type);
}

// Move a component between containers
function moveComponent(componentId, sourceContainerId, targetContainerId) {
  const component = document.querySelector(`[data-id="${componentId}"]`);
  const targetContainer = document.getElementById(targetContainerId);
  
  if (component && targetContainer) {
    targetContainer.appendChild(component);
    
    // Update project data
    const componentData = projectData[sourceContainerId].find(item => item.id === componentId);
    projectData[sourceContainerId] = projectData[sourceContainerId].filter(item => item.id !== componentId);
    projectData[targetContainerId].push(componentData);
  }
}

// Delete a component
function deleteComponent(componentId, containerId) {
  const component = document.querySelector(`[data-id="${componentId}"]`);
  if (component) {
    component.remove();
    projectData[containerId] = projectData[containerId].filter(item => item.id !== componentId);
    saveToStorage();
  }
}

// Configure a component
function configureComponent(componentId, type) {
  const component = document.querySelector(`[data-id="${componentId}"]`);
  const containerId = component.parentElement.id;
  const componentData = projectData[containerId].find(item => item.id === componentId);
  
  // Create configuration dialog
  const modal = document.createElement('div');
  modal.className = 'config-modal';
  modal.innerHTML = `
    <div class="config-content">
      <h3>Configure ${components[type].name}</h3>
      <form id="config-form">
        ${components[type].configOptions.map(option => `
          <div class="form-group">
            <label for="${option.toLowerCase()}">${option}:</label>
            <input type="text" id="${option.toLowerCase()}" name="${option.toLowerCase()}" 
              value="${componentData.configuration[option.toLowerCase()] || ''}">
          </div>
        `).join('')}
        <div class="button-group">
          <button type="submit">Save</button>
          <button type="button" class="cancel-btn">Cancel</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Handle form submission
  modal.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    components[type].configOptions.forEach(option => {
      const optionKey = option.toLowerCase();
      componentData.configuration[optionKey] = document.getElementById(optionKey).value;
    });
    
    updateComponentContent(component, componentData);
    modal.remove();
    saveToStorage();
  });
  
  // Handle cancel
  modal.querySelector('.cancel-btn').addEventListener('click', () => {
    modal.remove();
  });
}

// Update the component's display with configuration
function updateComponentContent(component, componentData) {
  const contentDiv = component.querySelector('.component-content');
  const type = componentData.type;
  
  switch (type) {
    case 'video':
      contentDiv.innerHTML = `
        <h4>${componentData.configuration.title || 'Untitled Video'}</h4>
        <div class="video-preview">
          ${componentData.configuration.url ? 
            `<div class="video-placeholder">Video: ${componentData.configuration.url}</div>` : 
            '<div class="video-placeholder">No URL provided</div>'}
        </div>
        <p>Duration: ${componentData.configuration.duration || 'Not specified'}</p>
      `;
      break;
      
    case 'quiz':
      contentDiv.innerHTML = `
        <h4>${componentData.configuration.title || 'Untitled Quiz'}</h4>
        <p>Questions: ${componentData.configuration.questions || 'None added yet'}</p>
        <p>Time limit: ${componentData.configuration.timelimit || 'No limit'}</p>
      `;
      break;
      
    case 'text':
      contentDiv.innerHTML = `
        <h4>${componentData.configuration.title || 'Untitled Text'}</h4>
        <p>${componentData.configuration.content || 'No content added yet'}</p>
      `;
      break;
      
    case 'code':
      contentDiv.innerHTML = `
        <h4>${componentData.configuration.language || 'Code'} Playground</h4>
        <div class="code-preview">
          <pre>${componentData.configuration.startingcode || '// Add code here'}</pre>
        </div>
        <p>${componentData.configuration.instructions || 'No instructions provided'}</p>
      `;
      break;
      
    case 'diagram':
      contentDiv.innerHTML = `
        <h4>${componentData.configuration.title || 'Untitled Diagram'}</h4>
        <div class="diagram-preview">
          ${componentData.configuration.imageurl ? 
            `<div class="diagram-placeholder">Diagram: ${componentData.configuration.imageurl}</div>` : 
            '<div class="diagram-placeholder">No image provided</div>'}
        </div>
        <p>Hotspots: ${componentData.configuration.hotspots || 'None added'}</p>
      `;
      break;
  }
}

// Toggle between build and preview modes
function toggleMode() {
  const body = document.body;
  const button = document.querySelector('.mode-toggle');
  
  if (body.classList.contains('preview-mode')) {
    body.classList.remove('preview-mode');
    button.textContent = 'Switch to Preview Mode';
    
    // Re-enable dragging
    document.querySelectorAll('.component').forEach(comp => {
      comp.draggable = true;
    });
  } else {
    body.classList.add('preview-mode');
    button.textContent = 'Switch to Build Mode';
    
    // Disable dragging in preview mode
    document.querySelectorAll('.component').forEach(comp => {
      comp.draggable = false;
    });
  }
}

// Save project data to localStorage
function saveToStorage() {
  localStorage.setItem('learningBuilder', JSON.stringify(projectData));
}

// Load project data from localStorage
function loadFromStorage() {
  const savedData = localStorage.getItem('learningBuilder');
  if (savedData) {
    projectData = JSON.parse(savedData);
    
    // Rebuild the components from saved data
    Object.keys(projectData).forEach(containerId => {
      const container = document.getElementById(containerId);
      if (container) {
        projectData[containerId].forEach(componentData => {
          const element = document.createElement('div');
          element.className = 'component';
          element.draggable = true;
          element.dataset.type = componentData.type;
          element.dataset.id = componentData.id;
          
          const component = components[componentData.type];
          
          element.innerHTML = `
            <div class="component-header">
              <span class="component-icon">${component.icon}</span>
              <span class="component-title">${component.name}</span>
              <div class="component-actions">
                <button class="config-btn">⚙️</button>
                <button class="delete-btn">❌</button>
              </div>
            </div>
            <div class="component-content"></div>
          `;
          
          element.addEventListener('dragstart', handleDragStart);
          element.querySelector('.config-btn').addEventListener('click', () => configureComponent(componentData.id, componentData.type));
          element.querySelector('.delete-btn').addEventListener('click', () => deleteComponent(componentData.id, containerId));
          
          container.appendChild(element);
          updateComponentContent(element, componentData);
        });
      }
    });
  }
}

// Initialize the chatbot with AI assistance
function initializeChatbot() {
  const chatBox = document.getElementById('chat-box');
  const userInput = document.getElementById('user-input');
  
  // Add welcome message
  addChatMessage('Assistant', 'Welcome to the Learning Builder! I can help you create educational modules. Try asking for suggestions or how to use specific components.');
  
  // Setup enter key for sending messages
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
}

// Send user message to chatbot
function sendMessage() {
  const chatBox = document.getElementById('chat-box');
  const userInput = document.getElementById('user-input');
  const message = userInput.value.trim();
  
  if (message) {
    // Add user message
    addChatMessage('You', message);
    
    // Clear input
    userInput.value = '';
    
    // Process the message and respond
    processUserMessage(message);
  }
}

// Add a message to the chat box
function addChatMessage(sender, message) {
  const chatBox = document.getElementById('chat-box');
  const messageElement = document.createElement('div');
  messageElement.className = `chat-message ${sender.toLowerCase()}`;
  messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
  chatBox.appendChild(messageElement);
  
  // Auto scroll to bottom
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Simple AI to process user messages
function processUserMessage(message) {
  const lowerMessage = message.toLowerCase();
  
  // Check for keywords and respond appropriately
  setTimeout(() => {
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      addChatMessage('Assistant', 'Hello! How can I help you with your learning module today?');
    }
    else if (lowerMessage.includes('help')) {
      addChatMessage('Assistant', 'I can help you build your learning module. Try dragging components from the toolbox into the boxes on the right. You can configure each component by clicking the gear icon.');
    }
    else if (lowerMessage.includes('video')) {
      addChatMessage('Assistant', 'Video components are great for introducing topics. You can add a YouTube URL or embed code. Try to keep videos under 5 minutes for better engagement.');
    }
    else if (lowerMessage.includes('quiz')) {
      addChatMessage('Assistant', 'Quizzes help reinforce learning. Add questions after content blocks to check understanding. You can set time limits for added challenge.');
    }
    else if (lowerMessage.includes('code')) {
      addChatMessage('Assistant', 'Code playgrounds are perfect for teaching programming. Students can experiment with the code in a safe environment.');
    }
    else if (lowerMessage.includes('save') || lowerMessage.includes('storage')) {
      addChatMessage('Assistant', 'Your work is automatically saved to your browser\'s local storage. You can close the page and return later.');
    }
    else if (lowerMessage.includes('export') || lowerMessage.includes('share')) {
      addChatMessage('Assistant', 'Currently, sharing is not implemented. In a future version, you\'ll be able to export your modules and share them with others.');
    }
    else if (lowerMessage.includes('suggestion') || lowerMessage.includes('idea')) {
      const suggestions = [
        'Try creating a learning path with a video introduction, followed by text content, and ending with a quiz.',
        'Interactive diagrams work well for visual learners. Add hotspots to explain different parts.',
        'For programming lessons, start with a simple code playground and gradually add complexity.',
        'Consider adding estimated completion times to each component to help learners plan.',
        'Use the preview mode to test how your module feels from a learner\'s perspective.'
      ];
      addChatMessage('Assistant', suggestions[Math.floor(Math.random() * suggestions.length)]);
    }
    else {
      addChatMessage('Assistant', 'I\'m here to help with your learning module. You can ask about specific components, how to structure your content, or request suggestions.');
    }
  }, 500); // Small delay to simulate thinking
}