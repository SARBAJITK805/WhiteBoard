import React, { useState, useEffect } from 'react';
import rough from 'roughjs/bundled/rough.esm';

const generator = rough.generator();

function createRoughElement(id, x1, y1, x2, y2, type) {
  if (type === 'line') {
    const roughElement = generator.line(x1, y1, x2, y2);
    readjustingCoordinates(x1, y1, x2, y2);
    return { id, x1, y1, x2, y2, roughElement, type };
  } else {
    const roughElement = generator.rectangle(x1, y1, x2 - x1, y2 - y1);
    readjustingCoordinates(x1, y1, x2, y2);
    return { id, x1, y1, x2, y2, roughElement, type };
  }
}

function distance(point1, point2) {
  return Math.sqrt(
    Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
  );
}

function readjustingCoordinates(element) {
  const { x1, y1, x2, y2, type } = element;
  if (type == 'rectangle') {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    return { x1: minX, y1: minY, x2: maxX, y2: maxY };
  } else {
    if (x1 < x2 || (x1 == x2 && y1 < y2)) {
      return { x1: x1, y1: y1, x2: x2, y2: y2 };
    } else {
      return { x1: x2, y1: y2, x2: x1, y2: y1 };
    }
  }
}

function isNearTo(x, y, x1, y1, name) {
  return Math.abs(x - x1) < 10 && Math.abs(y - y1) < 10 ? name : null;
}

function onLine(x, y, x1, y1, x2, y2) {
  const a = { x: x1, y: y1 };
  const b = { x: x2, y: y2 };
  const c = { x, y };

  const area = Math.abs((a.x - c.x) * (b.y - c.y) - (b.x - c.x) * (a.y - c.y));

  const lineLength = distance(a, b);
  const perpendicularDistance = area / lineLength;
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);

  const tolerance = 5;
  return (
    perpendicularDistance < tolerance &&
    x >= minX - tolerance &&
    x <= maxX + tolerance &&
    y >= minY - tolerance &&
    y <= maxY + tolerance
  );
}

function getElement(x, y, elements) {
  return elements
    .map((element) => {
      const { type, x1, y1, x2, y2 } = element;
      let position = null;

      if (type === 'rectangle') {
        const tl = isNearTo(x, y, x1, y1, 'tl');
        const tr = isNearTo(x, y, x2, y1, 'tr');
        const bl = isNearTo(x, y, x1, y2, 'bl');
        const br = isNearTo(x, y, x2, y2, 'br');
        const on = x >= x1 && x <= x2 && y >= y1 && y <= y2 ? 'on' : null;
        position = tl || tr || bl || br || on;
      } else if (type === 'line') {
        const start = isNearTo(x, y, x1, y1, 'start');
        const end = isNearTo(x, y, x2, y2, 'end');
        const on = onLine(x, y, x1, y1, x2, y2) ? 'on' : null;
        position = start || end || on;
      }
      return { ...element, position };
    })
    .find((element) => element.position !== null);
}

const cursorForPosition = position => {
  switch (position) {
    case "tl":
    case "br":
    case "start":
    case "end":
      return "nwse-resize";
    case "tr":
    case "bl":
      return "nesw-resize";
    default:
      return "move";
  }
};

const useHistory = initialState => {
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState([initialState]);

  const setState = (action, overwrite = false) => {
    const newState = typeof action === "function" ? action(history[index]) : action;
    if (overwrite) {
      const historyCopy = [...history];
      historyCopy[index] = newState;
      setHistory(historyCopy);
    } else {
      const updatedState = [...history].slice(0, index + 1);
      setHistory([...updatedState, newState]);
      setIndex(prevState => prevState + 1);
    }
  };
  const undo = () => index > 0 && setIndex(prevState => prevState - 1);
  const redo = () => index < history.length - 1 && setIndex(prevState => prevState + 1);

  return [history[index], setState, undo, redo];
};
function App() {
  const [elements, setElements, undo, redo] = useHistory([]);
  const [action, setAction] = useState('none');
  const [tool, setTool] = useState("line");
  const [selectedElement, setSelectedElement] = useState(null);

  useEffect(() => {
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const roughCanvas = rough.canvas(canvas);

    elements.forEach((element) => {
      roughCanvas.draw(element.roughElement);
    });
  }, [elements]);

  function updateEle(idx, x1, y1, x2, y2, type) {
    const updatedElement = createRoughElement(idx, x1, y1, x2, y2, type
    );
    const elementsCopy = [...elements];
    elementsCopy[idx] = updatedElement;
    setElements(elementsCopy, true);
  }

  function resizeObject(element, x, y) {
    const { position, x1, x2, y1, y2, id, type } = element;
    switch (position) {
      case 'start':
      case 'tl':
        updateEle(id, x, y, x2, y2, type);
        return;
      case 'tr':
        updateEle(id, x1, y, x, y2, type)
        return;
      case 'bl':
        updateEle(id, x, y1, x2, y, type)
        return;
      case 'br':
      case 'end':
        updateEle(id, x1, y1, x, y, type);
        return;
      default:
        return null;
    }
  }

  const handleMouseDown = (event) => {
    const { clientX, clientY } = event;
    if (tool === 'selection') {
      const elem = getElement(clientX, clientY, elements);
      if (elem) {
        setSelectedElement({
          ...elem,
          offsetX: clientX - elem.x1,
          offsetY: clientY - elem.y1,
        });
        setElements(prev => prev);
        if (elem.position === 'on' || elem.position === 'inside') {
          setAction('moving');
        } else {
          setAction('resizing');
        }
        console.log(elem);
      }
    } else {
      setAction('drawing');
      const id = elements.length;
      const element = createRoughElement(id, clientX, clientY, clientX, clientY, tool);
      setElements((prevElements) => [...prevElements, element]);
    }
  };

  const handleMouseMove = (event) => {
    const { clientX, clientY } = event;
    if (tool === 'selection') {
      const elem = getElement(clientX, clientY, elements);
      event.target.style.cursor = elem ? cursorForPosition(elem.position) : "default";
    }
    if (action === 'drawing') {
      const idx = elements.length - 1;
      const { x1, y1 } = elements[idx];
      updateEle(idx, x1, y1, clientX, clientY, tool);
    }
    else if (action === 'moving') {
      const { id, x1, x2, y1, y2, type, offsetX, offsetY } = selectedElement;
      const deltaX = clientX - offsetX - x1;
      const deltaY = clientY - offsetY - y1;

      updateEle(id, x1 + deltaX, y1 + deltaY, x2 + deltaX, y2 + deltaY, type);
    }
    else if (action === 'resizing') {
      console.log('resizing');
      resizeObject(selectedElement, clientX, clientY)
    }
  };

  const handleMouseUp = () => {
    if (selectedElement) {
      const idx = selectedElement.id;
      const { id, type } = elements[idx];
      if (action === 'drawing') {
        const { x1, x2, y1, y2 } = readjustingCoordinates(elements[idx]);
        updateEle(id, x1, y1, x2, y2, type);
      }
    }
    setAction('none');
    setSelectedElement(null);
  };

  const clearcanvas = () => {
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    setElements([]);
  }

  return (
    <div>
      <div style={{ position: "fixed", zIndex: 2 }}>
        <input
          type="radio"
          id="selection"
          checked={tool === "selection"}
          onChange={() => setTool("selection")}
        />
        <label htmlFor="selection">Selection</label>
        <input type="radio" id="line" checked={tool === "line"} onChange={() => setTool("line")} />
        <label htmlFor="line">Line</label>
        <input
          type="radio"
          id="rectangle"
          checked={tool === "rectangle"}
          onChange={() => setTool("rectangle")}
        />
        <label htmlFor="rectangle">Rectangle</label>
        <input
          type="radio"
          id="pencil"
          checked={tool === "pencil"}
          onChange={() => setTool("pencil")}
        />
        <label htmlFor="pencil">Pencil</label>
        <input type="radio" id="text" checked={tool === "text"} onChange={() => setTool("text")} />
        <label htmlFor="text">Text</label>
      </div>
      <div style={{ position: "fixed", zIndex: 2, bottom: 0, padding: 10 }}>
        <button onClick={undo}>Undo</button>
        <button onClick={redo}>Redo</button>
        <button onClick={clearcanvas}>Clear</button>
      </div>
      <canvas
        id="canvas"
        className="bg-gray-100"
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      ></canvas>
    </div>
  );
}

export default App;
