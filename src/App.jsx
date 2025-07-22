import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css"

function App() {
  const [content, setContent] = useState('');
  const [output, setOutput] = useState('');
  async function format() {
    invoke("format", { content })
      .then((msg) => {
        setOutput(msg)
      })
      .catch((err) => {
        console.error(err)
      })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();

      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const indent = '  '; // 2 spaces, you can change to '\t' for actual tab character

      // Find the start and end of the lines that contain the selection
      const selectionLineStart = value.lastIndexOf('\n', start - 1) + 1;
      const selectionLineEnd = end === start ? end : value.indexOf('\n', end - 1);
      const actualEnd = selectionLineEnd === -1 ? value.length : selectionLineEnd;

      // Get all lines within the selection
      const beforeSelection = value.substring(0, selectionLineStart);
      const selectedText = value.substring(selectionLineStart, actualEnd);
      const afterSelection = value.substring(actualEnd);

      const lines = selectedText.split('\n');

      if (e.shiftKey) {
        // Shift+Tab: Remove indentation from all selected lines
        let totalRemoved = 0;
        let firstLineRemoved = 0;

        const unindentedLines = lines.map((line, index) => {
          const indentMatch = line.match(/^(\s{1,2}|\t)/);
          if (indentMatch) {
            const removedLength = indentMatch[1].length;
            totalRemoved += removedLength;
            if (index === 0) {
              firstLineRemoved = removedLength;
            }
            return line.substring(removedLength);
          }
          return line;
        });

        const newValue = beforeSelection + unindentedLines.join('\n') + afterSelection;
        setContent(newValue);

        // Adjust selection
        setTimeout(() => {
          const newStart = Math.max(selectionLineStart, start - firstLineRemoved);
          const newEnd = end - totalRemoved;

          if (start === end) {
            // Single cursor position
            textarea.selectionStart = newStart;
            textarea.selectionEnd = newStart;
          } else {
            // Maintain selection
            textarea.selectionStart = newStart;
            textarea.selectionEnd = Math.max(newStart, newEnd);
          }
        }, 0);

      }
      else {
        // Tab: Add indentation to all selected lines
        const indentedLines = lines.map(line => indent + line);
        const newValue = beforeSelection + indentedLines.join('\n') + afterSelection;

        setContent(newValue);

        // Adjust selection
        setTimeout(() => {
          const addedLength = indent.length * lines.length;

          if (start === end) {
            // Single cursor position - move it forward
            const newPosition = start + indent.length;
            textarea.selectionStart = newPosition;
            textarea.selectionEnd = newPosition;
          } else {
            // Maintain selection, accounting for added indentation
            textarea.selectionStart = start + indent.length;
            textarea.selectionEnd = end + addedLength;
          }
        }, 0);
      }
    }
  };

  return (
    <div className="w-full h-screen p-4">
      <div className="border border-gray-600 rounded-lg overflow-hidden bg-gray-900 h-full">
        {/* Format Button at the top center */}
        <div className="flex justify-center py-3 border-b border-gray-600 bg-gray-800">
          <button
            onClick={format}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg"
          >
            Format
          </button>
        </div>

        <div className="flex h-full">
          {/* Live Editor Panel */}
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-full bg-gray-900 text-gray-100 p-4 resize-none outline-none font-mono text-sm placeholder:text-gray-500"
              placeholder="Write your trigger point here..."
            />
          </div>

          {/* Output Panel */}
          <div className="flex-1 border-l border-gray-600">
            <div className="h-full bg-gray-900 p-4">
              <pre className="text-gray-100 font-mono text-sm whitespace-pre-wrap">
                {output}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
