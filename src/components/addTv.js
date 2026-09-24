import React, { useState } from 'react';

const AddTv = () => {
  const [model, setModel] = useState('');
  return (
    <div>
      <form>
        <label>Brand</label>
        <input type='text' />
      </form>
    </div>
  );
};

export default AddTv;
