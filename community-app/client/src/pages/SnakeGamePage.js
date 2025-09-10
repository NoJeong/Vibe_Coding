import React from 'react';

const SnakeGamePage = () => {
  return (
    <div style={{ textAlign: 'center', paddingTop: '20px' }}>
      <h2>Snake Game</h2>
      <iframe
        src="http://localhost:3001/snake-game/index.html"
        title="Snake Game"
        width="800"
        height="600"
        style={{ border: '1px solid #ccc' }}
      />
    </div>
  );
};

export default SnakeGamePage;
