import { useRef, useState, useEffect } from "react";
import "./App.css";
import { Slider, Divider } from "@mui/joy";

function App() {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lineWidth, setLineWidth] = useState(85);
  const [clearTimeoutRef, setClearTimeoutRef] = useState(null);
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalHistory, setTerminalHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const scale = window.devicePixelRatio || 1;
    const minDimension = Math.min(
      window.innerWidth * 0.8,
      window.innerHeight * 0.9
    );
    canvas.width = minDimension * scale;
    canvas.height = minDimension * scale;

    canvas.style.width = `${minDimension}px`;
    canvas.style.height = `${minDimension}px`;

    ctx.scale(scale, scale);

    ctx.lineCap = "round";
    ctx.lineWidth = lineWidth;
    contextRef.current = ctx;
  }, [lineWidth]);

  const isCanvasEmpty = () => {
    const blank = document.createElement("canvas");
    blank.width = canvasRef.current.width;
    blank.height = canvasRef.current.height;
    return canvasRef.current.toDataURL() === blank.toDataURL();
  };

  const startAutoClear = () => {
    if (clearTimeoutRef) {
      clearTimeout(clearTimeoutRef);
    }

    const timeout = setTimeout(() => {
      if (!isCanvasEmpty()) {
        const image = canvasRef.current.toDataURL("image/png");

        sendImageToServer(image);
      }

      contextRef.current.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
    }, 1000);

    setClearTimeoutRef(timeout);
  };

  const sendImageToServer = async () => {
    setLoading(true);

    try {
      const canvas = canvasRef.current;

      // Convert to grayscale
      const grayScaleData = convertCanvasToGrayscale(canvas);

      console.log(grayScaleData);

      const response = await fetch("http://127.0.0.1:5000/api/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ grayScaleData }), // Send the grayscale data(Resized Array 28 * 28)
      });

      const data = await response.json();
      if (data.predicted_label == "=") {
        handleCalculate();
      } else {
        setTerminalInput((prev) => prev + data.predicted_label.toString());
      }
    } catch (error) {
      console.error("Error sending image to server:", error);
    } finally {
      setLoading(false); // Hide the loading spinner
    }
  };

  const convertCanvasToGrayscale = (canvas) => {
    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const grayScaleArray = [];

    for (let i = 0; i < data.length; i += 4) {
      // Calculate the grayscale value using the luminance formula
      const gray =
        0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];

      grayScaleArray.push(gray);
    }

    // Get canvas dimensions
    const width = canvas.width;
    const height = canvas.height;

    // Resize to [28, 28]
    const resizedGrayScaleArray = resizeArray(
      grayScaleArray,
      width,
      height,
      28,
      28
    );

    // Print the resized shape
    console.log("Resized Shape of grayscale array: [28, 28]");

    return resizedGrayScaleArray; // Return the resized grayscale pixel data as an array
  };

  // Function to resize the grayscale array
  const resizeArray = (
    grayScaleArray,
    originalWidth,
    originalHeight,
    newWidth,
    newHeight
  ) => {
    const resizedArray = new Array(newHeight)
      .fill(0)
      .map(() => new Array(newWidth).fill(0));

    const scaleX = originalWidth / newWidth;
    const scaleY = originalHeight / newHeight;

    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const startX = Math.floor(x * scaleX);
        const startY = Math.floor(y * scaleY);
        const endX = Math.ceil((x + 1) * scaleX);
        const endY = Math.ceil((y + 1) * scaleY);

        let sum = 0;
        let count = 0;

        for (let i = startY; i < endY; i++) {
          for (let j = startX; j < endX; j++) {
            if (i < originalHeight && j < originalWidth) {
              sum += grayScaleArray[i * originalWidth + j];
              count++;
            }
          }
        }

        // Calculate the average for the resized pixel
        resizedArray[y][x] = sum / count;
      }
    }

    return resizedArray;
  };

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
    startAutoClear();
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;

    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
    startAutoClear();
  };

  const stopDrawing = () => {
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  const handleOperatorClick = (operator) => {
    setTerminalInput((prev) => prev + operator);
  };

  const handleClear = () => {
    setTerminalInput("");
    setTerminalHistory([]);
  };

  const handleClean = () => {
    setTerminalInput((prev) => prev.slice(0, -1)); // Remove the last character
  };

  const handleCalculate = () => {
    try {
      const result = eval(terminalInput); // Simple calculation using eval (ensure input is safe)
      setTerminalHistory((prev) => [...prev, terminalInput + " = " + result]);
      setTerminalInput(result.toString());
    } catch (error) {
      alert("Invalid calculation");
      console.log(error);
    }
  };

  return (
    <div className="App" style={{ display: "flex" }}>
      <div className="toolbar">
        <h3>DrawCalc</h3>
        <Divider orientation="horizontal">TOOLS</Divider>

        <div className="container_line_width">
          <label>Line Width: {lineWidth}</label>
          <Slider
            value={lineWidth}
            onChange={(e, newValue) => setLineWidth(newValue)}
            aria-label="Line Width"
            min={85}
            max={95}
            step={1}
            color="success"
            disabled={false}
            marks
            orientation="horizontal"
            size="md"
            valueLabelDisplay="off"
            variant="solid"
          />
        </div>

        {/* Buttons for basic math operators */}
        <Divider orientation="horizontal">OPERATORS</Divider>
        <div className="math-buttons">
          <button onClick={() => handleOperatorClick("+")}>+</button>
          <button onClick={() => handleOperatorClick("-")}>-</button>
          <button onClick={() => handleOperatorClick("*")}>*</button>
          <button onClick={() => handleOperatorClick("/")}>/</button>
        </div>
        <div className="manage-terminal-buttons">
          <button onClick={() => handleClear()}>C/E</button>
          <button onClick={() => handleClean()}>C</button>
        </div>
        <button onClick={() => handleCalculate()}>Calculate...</button>
      </div>

      <div style={{ flex: 1, position: "relative" }}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{
            border: "1px solid black",
            marginTop: "10px",
            display: "block",
            width: "100%",
            height: "100%",
          }}
        />

        {loading && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontSize: "1.5rem",
              color: "green",
            }}
          >
            Loading...
          </div>
        )}
      </div>
      <div className="terminal-display">
        <h3>Terminal</h3>
        <Divider orientation="horizontal">HISTORYS</Divider>
        <div className="terminal-output">
          {terminalHistory.map((entry, index) => (
            <div key={index}>{entry}</div>
          ))}
          <div>{terminalInput}</div> {/* Display current terminal input */}
        </div>
      </div>
    </div>
  );
}

export default App;
