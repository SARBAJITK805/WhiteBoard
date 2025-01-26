import React, { useState, useEffect } from 'react';
import rough from 'roughjs/bundled/rough.esm';

const generator = rough.generator();

function createRoughElement(x1, y1, x2, y2, tool) {
  if (tool === 'line') {
    const roughElement = generator.line(x1, y1, x2, y2);
    return { x1, y1, x2, y2, roughElement };
  } else {
    const roughElement = generator.rectangle(x1, y1, x2 - x1, y2 - y1);
    return { x1, y1, x2, y2, roughElement };
  }
}

function App() {
  const [elements, setElements] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [tool, setTool] = useState("line");


  useEffect(() => {
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    const roughCanvas = rough.canvas(canvas);

    elements.forEach((element) => {
      roughCanvas.draw(element.roughElement);
    });
  }, [elements]);

  const handleMouseDown = (event) => {
    setDrawing(true);
    const { clientX, clientY } = event;
    const element = createRoughElement(clientX, clientY, clientX, clientY, tool);
    setElements((prevElements) => [...prevElements, element]);
  };

  const handleMouseMove = (event) => {
    if (tool === 'selection') {

    }
    else if (drawing) {
      const { clientX, clientY } = event;
      const idx = elements.length - 1;
      const { x1, y1 } = elements[idx];
      const updatedElement = createRoughElement(
        x1,
        y1,
        clientX,
        clientY,
        tool
      );
      const elementsCopy = [...elements];
      elementsCopy[idx] = updatedElement;
      setElements(elementsCopy);
    }

  };

  const handleMouseUp = () => {
    setDrawing(false);
  };

  const undo = () => {

  };

  const redo = () => {

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
