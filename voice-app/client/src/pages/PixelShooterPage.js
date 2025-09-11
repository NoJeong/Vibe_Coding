import React from 'react';

const PixelShooterPage = () => {
  return (
    <div style={{ textAlign: 'center', paddingTop: '20px' }}>
      <h2>Pixel Shooter</h2>
      <iframe
        src="http://localhost:3001/pixel-shooter/index.html"
        title="Pixel Shooter"
        width="800"
        height="600"
        style={{ border: '1px solid #ccc' }}
      />
    </div>
  );
};

export default PixelShooterPage;
