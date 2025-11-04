import React, { useEffect } from 'react';
import { listSurahs } from '../../services/apis';

const DownForMaintanance: React.FC = () => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#f8f9fa',
    textAlign: 'center',
    fontFamily: 'Arial, sans-serif',
    color: '#343a40',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 9999,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '2.5rem',
    marginBottom: '1rem',
  };

  const messageStyle: React.CSSProperties = {
    fontSize: '1.25rem',
  };

useEffect(() => {
    listSurahs();
}, []);

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>Down for Maintenance</h1>
      {/* <p style={messageStyle}>Please try again on 12PM PKT OCT-30</p> */}
      <p style={messageStyle}>Really sorry for the inconvenience! Due to some issues, we are unable to provide the service at the moment.</p>
      <p style={messageStyle}>Expected to be back around 12PM PKT Nov-5.</p>
    </div>
  );
};

export default DownForMaintanance;
