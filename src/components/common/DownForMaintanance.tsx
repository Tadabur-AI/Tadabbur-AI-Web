import React, { useEffect } from 'react';
import { listSurahs } from '../../services/apis';

const DownForMaintanance: React.FC = () => {
  useEffect(() => {
    listSurahs();
  }, []);

  return (
    <div className="flex flex-col justify-center items-center h-screen w-screen bg-background text-center font-sans text-text fixed top-0 left-0 z-[9999]">
      <h1 className="text-4xl font-bold mb-4 text-primary">Down for Maintenance</h1>
      <p className="text-xl text-text-muted">Really sorry for the inconvenience! Due to some issues, we are unable to provide the service at the moment.</p>
      <p className="text-xl text-text-muted">Expected to be back around 12PM PKT Nov-5.</p>
    </div>
  );
};

export default DownForMaintanance;
