import React from 'react';

/**
 * Reusable background pattern: grid of small dots + orange blobs at edges/corners.
 * Use inside a container with class "pattern-page" (position relative, overflow hidden).
 */
export default function PatternBackground() {
  return (
    <div className="pattern-bg" aria-hidden="true">
      <div className="pattern-corner pattern-corner-tl" />
      <div className="pattern-corner pattern-corner-tr" />
      <div className="pattern-corner pattern-corner-bl" />
      <div className="pattern-corner pattern-corner-br" />
      <div className="pattern-edge pattern-edge-t" />
      <div className="pattern-edge pattern-edge-b" />
      <div className="pattern-edge pattern-edge-l" />
      <div className="pattern-edge pattern-edge-r" />
      <div className="pattern-dots" />
    </div>
  );
}
