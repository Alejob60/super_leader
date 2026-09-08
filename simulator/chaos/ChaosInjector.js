class ChaosInjector {
  constructor() {
    this.config = {
      duplicateRate: parseFloat(process.env.CHAOS_DUPLICATE_RATE || '0.10'),
      invalidFormatRate: parseFloat(process.env.CHAOS_INVALID_FORMAT_RATE || '0.05'),
      issuerLatencyMin: parseInt(process.env.CHAOS_ISSUER_LATENCY_MIN || '100'),
      issuerLatencyMax: parseInt(process.env.CHAOS_ISSUER_LATENCY_MAX || '3000'),
      issuerTimeoutRate: parseFloat(process.env.CHAOS_ISSUER_TIMEOUT_RATE || '0.15'),
      issuerDowntimeDuration: parseInt(process.env.CHAOS_ISSUER_DOWN_DURATION || '30'),
      failRate: 0.05
    };
    
    this.issuerDown = false;
    this.issuerDownUntil = null;
  }

  random() {
    return Math.random();
  }

  shouldFail() {
    return this.issuerDown || this.random() < this.config.failRate;
  }

  shouldReturnInvalid() {
    return this.random() < this.config.invalidFormatRate;
  }

  shouldDuplicate() {
    return this.random() < this.config.duplicateRate;
  }

  shouldBusinessError() {
    return this.random() < 0.03;
  }

  shouldIssuerFail() {
    if (this.issuerDown) {
      if (this.issuerDownUntil && Date.now() > this.issuerDownUntil) {
        this.issuerDown = false;
        this.issuerDownUntil = null;
        console.log('[CHAOS] Issuer downtime ended');
        return false;
      }
      return true;
    }
    return this.random() < this.config.failRate;
  }

  shouldTimeout() {
    return this.random() < this.config.issuerTimeoutRate;
  }

  async injectLatency() {
    const delay = Math.floor(Math.random() * 2000) + 100;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  async injectIssuerLatency() {
    if (this.issuerDown) return;
    
    const delay = Math.floor(
      Math.random() * (this.config.issuerLatencyMax - this.config.issuerLatencyMin) +
      this.config.issuerLatencyMin
    );
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  triggerDowntime(durationSeconds = 30) {
    this.issuerDown = true;
    this.issuerDownUntil = Date.now() + (durationSeconds * 1000);
  }

  reset() {
    this.issuerDown = false;
    this.issuerDownUntil = null;
  }

  getStatus() {
    return {
      issuerDown: this.issuerDown,
      issuerDownUntil: this.issuerDownUntil ? new Date(this.issuerDownUntil).toISOString() : null,
      config: this.config
    };
  }
}

module.exports = { ChaosInjector };
