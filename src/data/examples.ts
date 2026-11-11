import { ProofOfCoordination } from "../types/proof";

export const VALID_EXAMPLE_PROOF: ProofOfCoordination = {
  version: "1.0",
  mesh_id: "mesh-vertex-eu-central-042",
  outcome_hash: "8f4b2e91c7d0a3561b8e4f209c3a7d65e18b4c902a7f6d31e5c8b094a2d7f163",
  timestamp_start: 1762714200120,
  timestamp_end: 1762714201960,
  participants: [
    {
      id: "node-res-01",
      public_key: "9e81d76922070015213909de67cdbaf42c654aedfffa8ab5e861cfc026001424",
      role: "resource",
      reputation: 1.84,
      authorized: true
    },
    {
      id: "node-res-02",
      public_key: "5aaf76656f9d0dae7c099bc2b08fcfbe71af9104c5040bb251eb80f367499f43",
      role: "resource",
      reputation: 1.62,
      authorized: true
    },
    {
      id: "node-orch-01",
      public_key: "e7a3dc5a0b3d9b83222268c36adf4ab2e8776f8271e31030da8955c38378efd0",
      role: "orchestration",
      reputation: 1.95,
      authorized: true
    },
    {
      id: "node-orch-02",
      public_key: "661a6257f9167e4f988f938116b2157745cd41cfe6b183daad0a10a70ef9c92b",
      role: "orchestration",
      reputation: 1.51,
      authorized: true
    }
  ],
  events: [
    {
      index: 0,
      event_hash: "e0a14d8c3b927f1065c8e3d21a4b90f78c62e1d54a9b03c87f21e6d4a90b5c11",
      sender_id: "node-orch-01",
      references: [],
      timestamp: 1762714200120
    },
    {
      index: 1,
      event_hash: "e1b93c7f2a840d5196f2c7b40e8d31a65f09c2b83d14e7a90c52b8f31d6e0422",
      sender_id: "node-res-01",
      references: [
        "e0a14d8c3b927f1065c8e3d21a4b90f78c62e1d54a9b03c87f21e6d4a90b5c11"
      ],
      timestamp: 1762714200410
    },
    {
      index: 2,
      event_hash: "e2c48a0d1f739b6204d9e1a53c7f82b19a40d6e72b83f1c05e94a2d78b1c6033",
      sender_id: "node-res-02",
      references: [
        "e0a14d8c3b927f1065c8e3d21a4b90f78c62e1d54a9b03c87f21e6d4a90b5c11",
        "e1b93c7f2a840d5196f2c7b40e8d31a65f09c2b83d14e7a90c52b8f31d6e0422"
      ],
      timestamp: 1762714200790
    },
    {
      index: 3,
      event_hash: "e3d72f5b9c014e8317a0f6c82d5b93e40c17a8f63e29d0b14f83c7a29e5d1844",
      sender_id: "node-orch-02",
      references: [
        "e1b93c7f2a840d5196f2c7b40e8d31a65f09c2b83d14e7a90c52b8f31d6e0422",
        "e2c48a0d1f739b6204d9e1a53c7f82b19a40d6e72b83f1c05e94a2d78b1c6033"
      ],
      timestamp: 1762714201180
    },
    {
      index: 4,
      event_hash: "e4e19b6c4a825f0428b1d7e93f6a04c51d28b9a74f30e1c25a94d8b30f6e2955",
      sender_id: "node-res-01",
      references: [
        "e2c48a0d1f739b6204d9e1a53c7f82b19a40d6e72b83f1c05e94a2d78b1c6033",
        "e3d72f5b9c014e8317a0f6c82d5b93e40c17a8f63e29d0b14f83c7a29e5d1844"
      ],
      timestamp: 1762714201540
    },
    {
      index: 5,
      event_hash: "e5f60c3d8b916a7539c2e8f04a7b15d62e39c0b85a41f2d36b05e9c41a7f3066",
      sender_id: "node-orch-01",
      references: [
        "e3d72f5b9c014e8317a0f6c82d5b93e40c17a8f63e29d0b14f83c7a29e5d1844",
        "e4e19b6c4a825f0428b1d7e93f6a04c51d28b9a74f30e1c25a94d8b30f6e2955"
      ],
      timestamp: 1762714201960
    }
  ],
  supermajority_threshold: 0.667,
  signatures: [
    {
      participant_id: "node-res-01",
      signature: "4c787280b764573701069fe34dc4d0d1f2f69f65b57b8711e6f6d0f8b5c6875390b2c57b2a6b645adb593404bf661e046b78dc6a79f065520e2f763ad16d1a0d"
    },
    {
      participant_id: "node-res-02",
      signature: "620bd451f53bcd2c816693e3d30e8a1b1ee682580d165bc5cb61e8784d52e7747a289f33161b6a08080c55ae0b5ebc907c0153449b61d8c3380af43e53570b0e"
    },
    {
      participant_id: "node-orch-01",
      signature: "a525fa943296d95bd90c38c7eac60b860e7dc039e6b4ba0490b375703d57661115b0184c6a701a1fe2ecd74f90bb1c67a331f5b90476be2e2ffa5bc0ad4b2e06"
    },
    {
      participant_id: "node-orch-02",
      signature: "e797a5bc49d5a65eeb72557f03e5dca989d311879c1321f55abb608eb23af64cc809888e3df7fb37bb7933d7158e2700be272dca7845cfa73c98540bd48f1202"
    }
  ],
  metadata: {
    consensus_engine: "vertex-1.4.2",
    epoch: 4189,
    finality_round: 3,
    workload_domain: "autonomous-drone-corridor-sync"
  }
};

export const TAMPERED_EXAMPLE_PROOF: ProofOfCoordination = {
  version: "1.0",
  mesh_id: "mesh-vertex-ap-east-019",
  outcome_hash: "8f4b2e91c7d0a3561b8e4f209c3a7d65e18b4c902a7f6d31e5c8b094a2d7f163",
  timestamp_start: 1762714200120,
  timestamp_end: 1762714202450,
  participants: [
    {
      id: "node-res-01",
      public_key: "9e81d76922070015213909de67cdbaf42c654aedfffa8ab5e861cfc026001424",
      role: "resource",
      reputation: 1.84,
      authorized: true
    },
    {
      id: "node-res-02",
      public_key: "5aaf76656f9d0dae7c099bc2b08fcfbe71af9104c5040bb251eb80f367499f43",
      role: "resource",
      reputation: 0.78,
      authorized: false
    },
    {
      id: "node-orch-01",
      public_key: "e7a3dc5a0b3d9b83222268c36adf4ab2e8776f8271e31030da8955c38378efd0",
      role: "orchestration",
      reputation: 1.95,
      authorized: true
    },
    {
      id: "node-orch-02",
      public_key: "661a6257f9167e4f988f938116b2157745cd41cfe6b183daad0a10a70ef9c92b",
      role: "orchestration",
      reputation: 1.51,
      authorized: true
    }
  ],
  events: [
    {
      index: 0,
      event_hash: "e0a14d8c3b927f1065c8e3d21a4b90f78c62e1d54a9b03c87f21e6d4a90b5c11",
      sender_id: "node-orch-01",
      references: [],
      timestamp: 1762714200120
    },
    {
      index: 1,
      event_hash: "e1b93c7f2a840d5196f2c7b40e8d31a65f09c2b83d14e7a90c52b8f31d6e0422",
      sender_id: "node-res-01",
      references: [
        "e0a14d8c3b927f1065c8e3d21a4b90f78c62e1d54a9b03c87f21e6d4a90b5c11"
      ],
      timestamp: 1762714200410
    },
    {
      index: 2,
      event_hash: "e2c48a0d1f739b6204d9e1a53c7f82b19a40d6e72b83f1c05e94a2d78b1c6033",
      sender_id: "node-res-02",
      references: [
        "e0a14d8c3b927f1065c8e3d21a4b90f78c62e1d54a9b03c87f21e6d4a90b5c11",
        "e1b93c7f2a840d5196f2c7b40e8d31a65f09c2b83d14e7a90c52b8f31d6e0422"
      ],
      timestamp: 1762714200790
    },
    {
      index: 3,
      event_hash: "e3d72f5b9c014e8317a0f6c82d5b93e40c17a8f63e29d0b14f83c7a29e5d1844",
      sender_id: "node-orch-02",
      references: [
        "e1b93c7f2a840d5196f2c7b40e8d31a65f09c2b83d14e7a90c52b8f31d6e0422"
      ],
      timestamp: 1762714201180
    },
    {
      index: 4,
      event_hash: "e4e19b6c4a825f0428b1d7e93f6a04c51d28b9a74f30e1c25a94d8b30f6e2955",
      sender_id: "node-res-01",
      references: [
        "e3d72f5b9c014e8317a0f6c82d5b93e40c17a8f63e29d0b14f83c7a29e5d1844"
      ],
      timestamp: 1762714201540
    },
    {
      index: 5,
      event_hash: "e5f60c3d8b916a7539c2e8f04a7b15d62e39c0b85a41f2d36b05e9c41a7f3066",
      sender_id: "node-orch-01",
      references: [
        "e4e19b6c4a825f0428b1d7e93f6a04c51d28b9a74f30e1c25a94d8b30f6e2955"
      ],
      timestamp: 1762714202450
    }
  ],
  supermajority_threshold: 0.667,
  signatures: [
    {
      participant_id: "node-res-01",
      signature: "4c787280b764573701069fe34dc4d0d1f2f69f65b57b8711e6f6d0f8b5c6875390b2c57b2a6b645adb593404bf661e046b78dc6a79f065520e2f763ad16d1a0d"
    },
    {
      participant_id: "node-res-02",
      signature: "620bd451f53bcd2c816693e3d30e8a1b1ee682580d165bc5cb61e8784d52e7747a289f33161b6a08080c55ae0b5ebc907c0153449b61d8c3380af43e53570b0e"
    },
    {
      participant_id: "node-orch-01",
      // Tampered signature bytes (altered first 8 hex characters)
      signature: "ffffffff3296d95bd90c38c7eac60b860e7dc039e6b4ba0490b375703d57661115b0184c6a701a1fe2ecd74f90bb1c67a331f5b90476be2e2ffa5bc0ad4b2e06"
    },
    {
      participant_id: "node-orch-02",
      signature: "e797a5bc49d5a65eeb72557f03e5dca989d311879c1321f55abb608eb23af64cc809888e3df7fb37bb7933d7158e2700be272dca7845cfa73c98540bd48f1202"
    }
  ],
  metadata: {
    consensus_engine: "vertex-1.4.2",
    epoch: 4190,
    finality_round: 2,
    note: "Tampered test vector: node-res-02 unauthorized & low reputation, node-orch-01 signature corrupted"
  }
};

export const WARNING_EXAMPLE_PROOF: ProofOfCoordination = {
  ...VALID_EXAMPLE_PROOF,
  mesh_id: "mesh-vertex-us-west-088",
  timestamp_start: 1762714200120,
  timestamp_end: 1762714203120,
  participants: [
    {
      id: "node-res-01",
      public_key: "9e81d76922070015213909de67cdbaf42c654aedfffa8ab5e861cfc026001424",
      role: "resource",
      reputation: 0.82,
      authorized: true
    },
    {
      id: "node-res-02",
      public_key: "5aaf76656f9d0dae7c099bc2b08fcfbe71af9104c5040bb251eb80f367499f43",
      role: "resource",
      reputation: 0.74,
      authorized: true
    },
    {
      id: "node-orch-01",
      public_key: "e7a3dc5a0b3d9b83222268c36adf4ab2e8776f8271e31030da8955c38378efd0",
      role: "orchestration",
      reputation: 0.91,
      authorized: true
    },
    {
      id: "node-orch-02",
      public_key: "661a6257f9167e4f988f938116b2157745cd41cfe6b183daad0a10a70ef9c92b",
      role: "orchestration",
      reputation: 1.51,
      authorized: true
    }
  ],
  metadata: {
    consensus_engine: "vertex-1.4.2",
    epoch: 4195,
    finality_round: 4,
    note: "Valid cryptographic signatures, but 3 of 4 participants are below 1.0 neutral reputation."
  }
};

export const SAMPLE_BATCH_PROOF_SET: { filename: string; proof: ProofOfCoordination }[] = [
  {
    filename: "proof-eu-central-042.json",
    proof: VALID_EXAMPLE_PROOF
  },
  {
    filename: "proof-us-west-088-degraded-rep.json",
    proof: WARNING_EXAMPLE_PROOF
  },
  {
    filename: "proof-ap-east-019-tampered.json",
    proof: TAMPERED_EXAMPLE_PROOF
  },
  {
    filename: "proof-eu-north-104.json",
    proof: {
      ...VALID_EXAMPLE_PROOF,
      mesh_id: "mesh-vertex-eu-north-104",
      timestamp_start: 1762714500000,
      timestamp_end: 1762714501420
    }
  }
];

