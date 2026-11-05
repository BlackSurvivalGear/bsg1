// Original BSG COMMS driver foundation. No CHIRP code or radio protocol assumptions.
export class DriverError extends Error {
  constructor(message, code = 'DRIVER_ERROR') { super(message); this.name = 'DriverError'; this.code = code; }
}
export class NativeRadioDriver {
  constructor({transport, model = 'uv-16-pro-v2'} = {}) {
    if (!transport || typeof transport.exchange !== 'function') throw new DriverError('A transport with exchange() is required', 'INVALID_TRANSPORT');
    this.transport = transport;
    this.model = model;
    this.state = 'idle';
  }
  async identify({signal} = {}) {
    if (this.state !== 'idle') throw new DriverError('Driver is busy', 'BUSY');
    if (signal?.aborted) throw new DriverError('Operation cancelled', 'ABORTED');
    this.state = 'identifying';
    try {
      // The only supported operation before hardware verification is simulated identification.
      if (this.transport.kind !== 'simulation') throw new DriverError('Physical radio identification is not validated', 'HARDWARE_UNVERIFIED');
      const reply = await this.transport.exchange({operation:'identify', model:this.model}, {signal});
      if (!reply || reply.model !== this.model || reply.simulated !== true) throw new DriverError('Unexpected simulator identity', 'IDENTITY_MISMATCH');
      return Object.freeze({model:reply.model, simulated:true, firmware:reply.firmware});
    } finally { this.state = 'idle'; }
  }
  async readMemory({signal} = {}) {
    if (this.state !== 'idle') throw new DriverError('Driver is busy', 'BUSY');
    if (signal?.aborted) throw new DriverError('Operation cancelled', 'ABORTED');
    this.state = 'reading';
    try {
      if (this.transport.kind !== 'simulation') throw new DriverError('Physical memory reads are not validated', 'HARDWARE_UNVERIFIED');
      const reply = await this.transport.exchange({operation:'read-memory', model:this.model}, {signal});
      if (!reply || reply.simulated !== true || reply.model !== this.model || !Array.isArray(reply.channels)) throw new DriverError('Invalid simulated memory response', 'INVALID_RESPONSE');
      return {model:reply.model, simulated:true, channels:reply.channels.map(channel=>({...channel}))};
    } finally { this.state = 'idle'; }
  }
  async writeMemory() { throw new DriverError('Radio writing is disabled pending hardware verification', 'WRITE_DISABLED'); }
}
