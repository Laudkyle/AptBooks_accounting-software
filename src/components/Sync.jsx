import { useState } from 'react';
import axios from 'axios';

export default function DatabaseUploader() {
  const [status, setStatus] = useState({ loading: false, message: '' });

 
  const handleUpload = async () => {
    setStatus({ loading: true, message: 'Preparing upload...' });
    
    try {
      // First get the file through our local proxy
      const localResponse = await axios.get('http://localhost:5100/api/local-db', {
        responseType: 'blob'
      });
      
      // Prepare for upload to remote server
      const formData = new FormData();
      formData.append('database', localResponse.data, 'shopdb.sqlite');

      setStatus({ loading: true, message: 'Uploading to server...' });
      
      const uploadResponse = await axios.post(
        'https://app.ryamex.com/upp/api/upload-db', 
        formData, 
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setStatus({ loading: false, message: uploadResponse.data.message });
    } catch (error) {
      setStatus({ 
        loading: false, 
        message: error.response?.data?.error || 'Upload failed' 
      });
    }}
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Database Sync</h2>
      
      <button
        onClick={handleUpload}
        disabled={status.loading}
        className={`w-full py-2 px-4 rounded-md text-white font-medium
          ${status.loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          transition-colors duration-200`}
      >
        {status.loading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Syncing...
          </span>
        ) : 'Sync Database Now'}
      </button>
      
      {status.message && (
        <div className={`mt-4 p-3 rounded-md ${
          status.message.includes('failed') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>
          {status.message}
        </div>
      )}
      
      <p className="mt-3 text-sm text-gray-600">
        This will automatically upload your local database to the server.
      </p>
    </div>
  );
}