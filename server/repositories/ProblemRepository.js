import { Problem } from '../domain/Problem.js';

export class ProblemRepository {
  constructor() {
    this.problems = new Map();
    this._seedProblems();
  }

  getAll() {
    return Array.from(this.problems.values()).map(p => ({
      id: p.id,
      title: p.title,
      difficulty: p.difficulty,
      category: p.category,
      estimatedTime: p.estimatedTime,
      summary: p.summary,
      patternsTargeted: p.patternsTargeted
    }));
  }

  getById(id) {
    return this.problems.get(id) || null;
  }

  _seedProblems() {
    // Problem 1: Smart Parking Lot System
    const parkingLot = new Problem({
      id: 'parking-lot',
      title: 'Design a Smart Multi-Floor Parking Lot',
      difficulty: 'Medium',
      category: 'Creational, Strategy & Concurrency',
      estimatedTime: '45 mins',
      summary: 'Design an automated, multi-level parking lot system supporting multiple vehicle types, dynamic spot allocation strategies, fee computation, and concurrent entry/exit gate operations.',
      functionalRequirements: [
        'Support multiple parking floors and multiple entry and exit gates operating concurrently.',
        'Support diverse vehicle types: Motorcycle, Compact Car, SUV/Truck, and Electric Vehicle (EV).',
        'Dynamically assign an available spot to an incoming vehicle based on a configurable allocation strategy (e.g., Nearest to Entrance, Best-Fit, or Lowest Floor First).',
        'Issue an entry ticket containing ticket ID, timestamp, assigned spot ID, and vehicle info.',
        'Calculate fees upon exit based on vehicle type and duration using a pluggable pricing strategy (e.g., Flat Rate, Hourly Tiered, Peak-hour Surge).',
        'Update display boards at each floor and entrance gate reflecting real-time free spot counts.'
      ],
      nonFunctionalRequirements: [
        'Thread-safety: Prevent race conditions when two gates attempt to allocate the last available spot simultaneously.',
        'Extensibility (Open/Closed): Easy addition of new vehicle types, spot types, or pricing models without modifying core lot controller.',
        'Separation of Concerns: Decouple ticket issuance, parking allocation, payment processing, and sensor/display notification.'
      ],
      constraints: [
        'In-memory design: Focus on class relationships, interfaces, and state transitions rather than database schemas or cloud infra.',
        'A vehicle can only park in a spot that accommodates its size (e.g., Truck cannot fit into Motorcycle spot).'
      ],
      keyEntities: [
        'ParkingLot', 'ParkingFloor', 'ParkingSpot', 'Vehicle', 'Ticket',
        'ParkingStrategy', 'PricingStrategy', 'EntranceGate', 'ExitGate', 'DisplayBoard'
      ],
      patternsTargeted: ['Strategy Pattern', 'Factory Pattern', 'Observer Pattern', 'Singleton / Facade'],
      checklist: [
        { id: 'c1', label: 'Entities defined for Lot, Floor, Spot, Vehicle, and Ticket', category: 'Completeness' },
        { id: 'c2', label: 'Spot allocation logic uses Strategy Pattern (IParkingStrategy)', category: 'Design Patterns' },
        { id: 'c3', label: 'Fee calculation decoupled via IPricingStrategy', category: 'SOLID' },
        { id: 'c4', label: 'Thread-safety considerations addressed (locks or atomic status check)', category: 'Concurrency' },
        { id: 'c5', label: 'Display boards notified via Observer pattern or event publishing', category: 'Modularity' }
      ],
      changeScenarios: [
        {
          id: 'ev-charging',
          title: 'Requirement Shift: EV Fast-Charging & kWh Metering',
          prompt: 'The parking lot wants to introduce dedicated EV charging spots that bill not only for parking duration but also for total kWh consumed via an external meter sensor.',
          affectedAreas: ['ParkingSpot', 'Ticket', 'PricingStrategy', 'ExitGate'],
          evaluationFocus: 'Did you use a Strategy or Decorator pattern for pricing, or is duration-only pricing hardcoded inside Ticket/ExitGate?'
        },
        {
          id: 'valet-priority',
          title: 'Requirement Shift: Valet VIP Reservations',
          prompt: 'VIP customers can reserve prime spots 30 minutes in advance. If they arrive late, the spot is released back to the general pool.',
          affectedAreas: ['ParkingSpot', 'ParkingStrategy', 'ReservationManager'],
          evaluationFocus: 'Can spot states expand beyond FREE/OCCUPIED to RESERVED without breaking spot search algorithms?'
        }
      ],
      starterTemplates: {
        java: `// Smart Parking Lot System - Starter Template
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

// 1. Vehicle Hierarchy
enum VehicleType { MOTORCYCLE, CAR, TRUCK, ELECTRIC }

abstract class Vehicle {
    private final String licensePlate;
    private final VehicleType type;

    public Vehicle(String licensePlate, VehicleType type) {
        this.licensePlate = licensePlate;
        this.type = type;
    }
    public String getLicensePlate() { return licensePlate; }
    public VehicleType getType() { return type; }
}

// 2. Parking Spot Hierarchy
enum SpotType { MOTORCYCLE, COMPACT, LARGE, ELECTRIC }

class ParkingSpot {
    private final String id;
    private final SpotType spotType;
    private volatile boolean isOccupied;
    private Vehicle currentVehicle;
    private final ReentrantLock lock = new ReentrantLock();

    public ParkingSpot(String id, SpotType spotType) {
        this.id = id;
        this.spotType = spotType;
        this.isOccupied = false;
    }

    public boolean assignVehicle(Vehicle v) {
        lock.lock();
        try {
            if (!isOccupied && canFitVehicle(v)) {
                this.currentVehicle = v;
                this.isOccupied = true;
                return true;
            }
            return false;
        } finally {
            lock.unlock();
        }
    }

    public void vacate() {
        lock.lock();
        try {
            this.currentVehicle = null;
            this.isOccupied = false;
        } finally {
            lock.unlock();
        }
    }

    public boolean canFitVehicle(Vehicle v) {
        // TODO: Map spot capacity to vehicle requirements
        return true;
    }

    public String getId() { return id; }
    public boolean isOccupied() { return isOccupied; }
}

// 3. Strategy Patterns for Allocation & Pricing
interface ParkingAllocationStrategy {
    ParkingSpot findSpot(List<ParkingFloor> floors, Vehicle vehicle);
}

interface PricingStrategy {
    double calculateFee(Ticket ticket, Date exitTime);
}

class HourlyPricingStrategy implements PricingStrategy {
    private final double hourlyRate = 20.0;
    @Override
    public double calculateFee(Ticket ticket, Date exitTime) {
        long durationMillis = exitTime.getTime() - ticket.getEntryTime().getTime();
        long hours = (long) Math.ceil(durationMillis / (1000.0 * 60 * 60));
        return Math.max(1, hours) * hourlyRate;
    }
}

// 4. Ticket
class Ticket {
    private final String ticketId;
    private final String spotId;
    private final Vehicle vehicle;
    private final Date entryTime;

    public Ticket(String ticketId, String spotId, Vehicle vehicle) {
        this.ticketId = ticketId;
        this.spotId = spotId;
        this.vehicle = vehicle;
        this.entryTime = new Date();
    }
    public Date getEntryTime() { return entryTime; }
    public String getSpotId() { return spotId; }
}

// 5. Floor & Lot Facade
class ParkingFloor {
    private final int floorNumber;
    private final List<ParkingSpot> spots = new ArrayList<>();

    public ParkingFloor(int floorNumber) { this.floorNumber = floorNumber; }
    public void addSpot(ParkingSpot spot) { spots.add(spot); }
    public List<ParkingSpot> getSpots() { return spots; }
}

class ParkingLot {
    private static ParkingLot instance;
    private final List<ParkingFloor> floors = new ArrayList<>();
    private ParkingAllocationStrategy allocationStrategy;
    private PricingStrategy pricingStrategy;

    private ParkingLot() {}

    public static synchronized ParkingLot getInstance() {
        if (instance == null) instance = new ParkingLot();
        return instance;
    }

    public Ticket parkVehicle(Vehicle vehicle) {
        // TODO: Implement parking flow using strategies
        return null;
    }

    public double unparkVehicle(Ticket ticket) {
        // TODO: Implement unparking & fee calculation
        return 0.0;
    }
}`,
        typescript: `// Smart Parking Lot System - TypeScript Starter
export enum VehicleType { MOTORCYCLE, CAR, TRUCK, ELECTRIC }
export enum SpotType { MOTORCYCLE, COMPACT, LARGE, ELECTRIC }

export abstract class Vehicle {
  constructor(public readonly licensePlate: string, public readonly type: VehicleType) {}
}

export class Car extends Vehicle {
  constructor(licensePlate: string) { super(licensePlate, VehicleType.CAR); }
}

export class ParkingSpot {
  private occupied = false;
  private vehicle: Vehicle | null = null;

  constructor(public readonly id: string, public readonly type: SpotType) {}

  public isOccupied(): boolean { return this.occupied; }

  public assignVehicle(v: Vehicle): boolean {
    if (this.occupied) return false;
    this.vehicle = v;
    this.occupied = true;
    return true;
  }

  public vacate(): void {
    this.occupied = false;
    this.vehicle = null;
  }
}

export interface IParkingStrategy {
  findSpot(floors: ParkingFloor[], vehicle: Vehicle): ParkingSpot | null;
}

export interface IPricingStrategy {
  calculateFee(ticket: Ticket, exitTime: Date): number;
}

export class HourlyPricingStrategy implements IPricingStrategy {
  constructor(private hourlyRate: number = 20) {}
  calculateFee(ticket: Ticket, exitTime: Date): number {
    const hours = Math.max(1, Math.ceil((exitTime.getTime() - ticket.entryTime.getTime()) / 3600000));
    return hours * this.hourlyRate;
  }
}

export class Ticket {
  public readonly entryTime: Date = new Date();
  constructor(
    public readonly id: string,
    public readonly spotId: string,
    public readonly vehicle: Vehicle
  ) {}
}

export class ParkingFloor {
  public spots: ParkingSpot[] = [];
  constructor(public readonly floorNumber: number) {}
}

export class ParkingLot {
  private static instance: ParkingLot;
  public floors: ParkingFloor[] = [];
  public allocationStrategy!: IParkingStrategy;
  public pricingStrategy: IPricingStrategy = new HourlyPricingStrategy();

  public static getInstance(): ParkingLot {
    if (!ParkingLot.instance) ParkingLot.instance = new ParkingLot();
    return ParkingLot.instance;
  }

  public park(vehicle: Vehicle): Ticket | null {
    const spot = this.allocationStrategy?.findSpot(this.floors, vehicle);
    if (!spot || !spot.assignVehicle(vehicle)) return null;
    return new Ticket(\`TKT-\${Date.now()}\`, spot.id, vehicle);
  }
}`,
        python: `# Smart Parking Lot System - Python Starter
from abc import ABC, abstractmethod
from datetime import datetime
import threading
from enum import Enum

class VehicleType(Enum):
    MOTORCYCLE = 1
    CAR = 2
    TRUCK = 3
    ELECTRIC = 4

class Vehicle:
    def __init__(self, license_plate: str, vehicle_type: VehicleType):
        self.license_plate = license_plate
        self.type = vehicle_type

class ParkingSpot:
    def __init__(self, spot_id: str, spot_type: VehicleType):
        self.spot_id = spot_id
        self.spot_type = spot_type
        self.is_occupied = False
        self.vehicle = None
        self._lock = threading.Lock()

    def assign(self, vehicle: Vehicle) -> bool:
        with self._lock:
            if not self.is_occupied:
                self.is_occupied = True
                self.vehicle = vehicle
                return True
            return False

    def vacate(self):
        with self._lock:
            self.is_occupied = False
            self.vehicle = None

class ParkingStrategy(ABC):
    @abstractmethod
    def find_spot(self, floors, vehicle: Vehicle):
        pass

class PricingStrategy(ABC):
    @abstractmethod
    def calculate_fee(self, ticket, exit_time: datetime) -> float:
        pass

class Ticket:
    def __init__(self, ticket_id: str, spot_id: str, vehicle: Vehicle):
        self.ticket_id = ticket_id
        self.spot_id = spot_id
        self.vehicle = vehicle
        self.entry_time = datetime.now()
`,
        cpp: `// Smart Parking Lot System - C++ Starter
#include <iostream>
#include <string>
#include <vector>
#include <memory>
#include <mutex>
#include <chrono>

enum class VehicleType { MOTORCYCLE, CAR, TRUCK, ELECTRIC };
enum class SpotType { MOTORCYCLE, COMPACT, LARGE, ELECTRIC };

class Vehicle {
protected:
    std::string licensePlate;
    VehicleType type;
public:
    Vehicle(std::string plate, VehicleType t) : licensePlate(plate), type(t) {}
    virtual ~Vehicle() = default;
    VehicleType getType() const { return type; }
};

class ParkingSpot {
private:
    std::string id;
    SpotType type;
    bool occupied = false;
    std::shared_ptr<Vehicle> vehicle;
    std::mutex mtx;
public:
    ParkingSpot(std::string id, SpotType t) : id(id), type(t) {}
    bool assignVehicle(std::shared_ptr<Vehicle> v) {
        std::lock_guard<std::mutex> lock(mtx);
        if (!occupied) {
            occupied = true;
            vehicle = v;
            return true;
        }
        return false;
    }
    void vacate() {
        std::lock_guard<std::mutex> lock(mtx);
        occupied = false;
        vehicle = nullptr;
    }
};
`
      }
    });

    // Problem 2: Multi-Car Elevator Dispatcher System
    const elevatorSystem = new Problem({
      id: 'elevator-system',
      title: 'Design a Multi-Car Elevator Dispatcher System',
      difficulty: 'Hard',
      category: 'State Machine & Scheduling',
      estimatedTime: '55 mins',
      summary: 'Design a multi-car elevator control system for a modern commercial high-rise building with N elevators and M floors. Focus on the State Pattern for individual elevator cabs, observer notifications for floor displays, and pluggable dispatching algorithms (e.g. SCAN / LOOK / Nearest-Car).',
      functionalRequirements: [
        'Manage N elevator cars serving M floors concurrently.',
        'Accept external floor hall calls (e.g., Floor 4 requesting UP) and internal elevator destination button presses (e.g., Car 2 selecting Floor 10).',
        'Model elevator car states explicitly: IDLE, MOVING_UP, MOVING_DOWN, DOOR_OPEN, MAINTENANCE.',
        'Implement an intelligent Dispatcher to assign hall calls to the most optimal elevator car based on distance, direction, and pending requests.',
        'Handle door sensors (open, close, obstruction detected) and load limits (weight sensor triggering OVERLOAD state).',
        'Notify floor displays and waiting passengers of car arrival and travel direction.'
      ],
      nonFunctionalRequirements: [
        'State pattern: Each elevator car state should encapsulate its legal transitions and button-handling logic.',
        'Extensibility: Dispatching algorithm should be pluggable (e.g., Nearest Car vs. SCAN / LOOK vs. Energy Saving).',
        'Safety & Fault tolerance: Emergency stop and maintenance override modes must take immediate precedence.'
      ],
      constraints: [
        'Single request should not be served twice by different cars.',
        'Cars must service requests in directional order before reversing direction.'
      ],
      keyEntities: [
        'ElevatorController', 'ElevatorCar', 'ElevatorState', 'MovingUpState', 'MovingDownState', 'IdleState',
        'HallRequest', 'InternalButton', 'DispatcherStrategy', 'DoorSensor'
      ],
      patternsTargeted: ['State Pattern', 'Strategy Pattern', 'Observer Pattern', 'Command Pattern'],
      checklist: [
        { id: 'c1', label: 'Elevator states modeled with State Pattern (avoiding giant switch statements)', category: 'Design Patterns' },
        { id: 'c2', label: 'Dispatcher strategy decoupled via interface', category: 'SOLID' },
        { id: 'c3', label: 'Distinction between external hall requests and internal car buttons', category: 'Domain Modeling' },
        { id: 'c4', label: 'Safe state transitions (e.g., cannot move while door is open)', category: 'State Management' }
      ],
      changeScenarios: [
        {
          id: 'vip-override',
          title: 'Requirement Shift: VIP Penthouse / Firefighter Override Mode',
          prompt: 'Building security initiates a Fire Emergency or VIP Priority ride. An elevator must cancel all current hall calls, travel directly to the designated floor non-stop, and lock out regular passenger input.',
          affectedAreas: ['ElevatorCar', 'ElevatorState', 'ElevatorController'],
          evaluationFocus: 'Can emergency / override behavior be injected cleanly via a state or decorator without modifying every movement method?'
        }
      ],
      starterTemplates: {
        java: `// Multi-Car Elevator System - Java Starter
import java.util.*;

enum Direction { UP, DOWN, IDLE }
enum DoorStatus { OPEN, CLOSED, OBSTRUCTED }

interface ElevatorState {
    void handleHallRequest(ElevatorCar car, int floor, Direction direction);
    void move(ElevatorCar car);
    void openDoor(ElevatorCar car);
    void closeDoor(ElevatorCar car);
}

class IdleState implements ElevatorState {
    public void handleHallRequest(ElevatorCar car, int floor, Direction direction) {
        if (floor > car.getCurrentFloor()) {
            car.setState(new MovingUpState());
        } else if (floor < car.getCurrentFloor()) {
            car.setState(new MovingDownState());
        }
    }
    public void move(ElevatorCar car) { /* Stay put */ }
    public void openDoor(ElevatorCar car) { car.setDoorStatus(DoorStatus.OPEN); }
    public void closeDoor(ElevatorCar car) { car.setDoorStatus(DoorStatus.CLOSED); }
}

class MovingUpState implements ElevatorState {
    public void handleHallRequest(ElevatorCar car, int floor, Direction direction) {
        car.addStop(floor);
    }
    public void move(ElevatorCar car) {
        car.setCurrentFloor(car.getCurrentFloor() + 1);
        if (car.shouldStopAt(car.getCurrentFloor())) {
            car.openDoor();
        }
    }
    public void openDoor(ElevatorCar car) { /* Cannot open while moving */ }
    public void closeDoor(ElevatorCar car) { car.setDoorStatus(DoorStatus.CLOSED); }
}

class MovingDownState implements ElevatorState {
    public void handleHallRequest(ElevatorCar car, int floor, Direction direction) {
        car.addStop(floor);
    }
    public void move(ElevatorCar car) {
        car.setCurrentFloor(car.getCurrentFloor() - 1);
    }
    public void openDoor(ElevatorCar car) { /* Cannot open while moving */ }
    public void closeDoor(ElevatorCar car) { car.setDoorStatus(DoorStatus.CLOSED); }
}

interface DispatcherStrategy {
    ElevatorCar selectElevator(List<ElevatorCar> cars, int requestedFloor, Direction direction);
}

class ElevatorCar {
    private final int id;
    private int currentFloor = 1;
    private ElevatorState state = new IdleState();
    private DoorStatus doorStatus = DoorStatus.CLOSED;
    private final TreeSet<Integer> upStops = new TreeSet<>();
    private final TreeSet<Integer> downStops = new TreeSet<>(Collections.reverseOrder());

    public ElevatorCar(int id) { this.id = id; }
    public void setState(ElevatorState s) { this.state = s; }
    public void setDoorStatus(DoorStatus d) { this.doorStatus = d; }
    public int getCurrentFloor() { return currentFloor; }
    public void setCurrentFloor(int f) { this.currentFloor = f; }
    public void addStop(int f) { upStops.add(f); }
    public boolean shouldStopAt(int f) { return upStops.contains(f); }
    public void openDoor() { state.openDoor(this); }
}
`,
        typescript: `// Multi-Car Elevator System - TypeScript Starter
export enum Direction { UP = 'UP', DOWN = 'DOWN', IDLE = 'IDLE' }

export interface ElevatorState {
  move(car: ElevatorCar): void;
  openDoor(car: ElevatorCar): void;
  closeDoor(car: ElevatorCar): void;
}

export class IdleState implements ElevatorState {
  move(car: ElevatorCar): void { /* No-op */ }
  openDoor(car: ElevatorCar): void { car.isDoorOpen = true; }
  closeDoor(car: ElevatorCar): void { car.isDoorOpen = false; }
}

export class MovingUpState implements ElevatorState {
  move(car: ElevatorCar): void {
    car.currentFloor += 1;
  }
  openDoor(car: ElevatorCar): void { throw new Error('Cannot open door while moving'); }
  closeDoor(car: ElevatorCar): void { car.isDoorOpen = false; }
}

export interface IDispatcherStrategy {
  dispatch(cars: ElevatorCar[], floor: number, direction: Direction): ElevatorCar;
}

export class ElevatorCar {
  public currentFloor = 1;
  public isDoorOpen = false;
  public state: ElevatorState = new IdleState();

  constructor(public readonly id: number) {}

  public requestFloor(floor: number): void {
    if (floor > this.currentFloor) {
      this.state = new MovingUpState();
    }
  }
}
`,
        python: `# Multi-Car Elevator System - Python Starter
from abc import ABC, abstractmethod
from enum import Enum

class Direction(Enum):
    UP = 1
    DOWN = 2
    IDLE = 3

class ElevatorState(ABC):
    @abstractmethod
    def move(self, car): pass

class IdleState(ElevatorState):
    def move(self, car):
        pass

class ElevatorCar:
    def __init__(self, car_id: int):
        self.id = car_id
        self.current_floor = 1
        self.state = IdleState()
        self.is_door_open = False
`,
        cpp: `// Multi-Car Elevator System - C++ Starter
#include <iostream>
#include <vector>
#include <memory>

enum class Direction { UP, DOWN, IDLE };

class ElevatorCar;

class ElevatorState {
public:
    virtual ~ElevatorState() = default;
    virtual void move(ElevatorCar& car) = 0;
};
`
      }
    });

    // Problem 3: Smart Vending Machine
    const vendingMachine = new Problem({
      id: 'vending-machine',
      title: 'Design a Smart Snack & Beverage Vending Machine',
      difficulty: 'Easy',
      category: 'State Pattern & Strategy',
      estimatedTime: '35 mins',
      summary: 'Design the low-level domain for a modern automated vending machine. Handle item selection, multi-currency cash & contactless payments, coin change dispensing, and safe state machine transitions (Idle, HasMoney, Dispensing, SoldOut).',
      functionalRequirements: [
        'Inventory management with distinct slots (rack, row, price, stock count).',
        'State transitions: IDLE -> HAS_MONEY -> DISPENSING -> SOLD_OUT.',
        'Support multiple payment methods: Cash/Coin, Credit Card, NFC Mobile.',
        'Calculate and dispense exact change using available cash inventory.',
        'Allow user cancellation before dispensing with full refund.'
      ],
      nonFunctionalRequirements: [
        'State Pattern to prevent invalid operations (e.g. dispensing before paying).',
        'Strategy pattern for payments to easily plug in new processors.'
      ],
      constraints: ['Machine must ensure item is physically dropped before decrementing stock.'],
      keyEntities: ['VendingMachine', 'VendingState', 'Inventory', 'ItemSlot', 'Item', 'PaymentStrategy', 'CoinDispenser'],
      patternsTargeted: ['State Pattern', 'Strategy Pattern', 'Factory Pattern'],
      checklist: [
        { id: 'c1', label: 'VendingMachine state transitions encapsulated in State classes', category: 'Design Patterns' },
        { id: 'c2', label: 'Item inventory separated from machine state', category: 'SOLID' },
        { id: 'c3', label: 'Payment decoupled via PaymentStrategy', category: 'Extensibility' }
      ],
      changeScenarios: [
        {
          id: 'bogo-promo',
          title: 'Requirement Shift: Buy-One-Get-One (BOGO) & Promo Discounts',
          prompt: 'Marketing wants to offer flash happy-hour discounts and BOGO promotions without changing vending machine state logic.',
          affectedAreas: ['ItemSlot', 'PricingEngine', 'PaymentStrategy'],
          evaluationFocus: 'Is item price hardcoded or evaluated through a pricing decorator/strategy?'
        }
      ],
      starterTemplates: {
        java: `// Vending Machine - Java Starter
import java.util.*;

enum Coin { NICKEL(5), DIME(10), QUARTER(25), DOLLAR(100); private final int value; Coin(int v) { this.value = v; } public int getValue() { return value; } }

interface VendingMachineState {
    void selectItem(VendingMachine machine, String code);
    void insertMoney(VendingMachine machine, int amount);
    void dispenseItem(VendingMachine machine);
    void cancelTransaction(VendingMachine machine);
}

class IdleState implements VendingMachineState {
    public void selectItem(VendingMachine machine, String code) {
        System.out.println("Item selected: " + code);
        machine.setState(machine.getHasMoneyState());
    }
    public void insertMoney(VendingMachine machine, int amount) {
        machine.addBalance(amount);
        machine.setState(machine.getHasMoneyState());
    }
    public void dispenseItem(VendingMachine machine) {
        System.out.println("Please select item and insert money first.");
    }
    public void cancelTransaction(VendingMachine machine) {
        System.out.println("No active transaction.");
    }
}

class VendingMachine {
    private VendingMachineState state = new IdleState();
    private final VendingMachineState hasMoneyState = new IdleState(); // replace with concrete
    private int currentBalance = 0;

    public void setState(VendingMachineState state) { this.state = state; }
    public VendingMachineState getHasMoneyState() { return hasMoneyState; }
    public void addBalance(int amt) { this.currentBalance += amt; }
    public int getBalance() { return currentBalance; }
}
`,
        typescript: `// Vending Machine - TypeScript Starter
export interface VendingState {
  selectItem(code: string): void;
  insertMoney(amount: number): void;
  dispense(): void;
  cancel(): void;
}
`,
        python: `# Vending Machine - Python Starter
from abc import ABC, abstractmethod

class VendingState(ABC):
    @abstractmethod
    def insert_money(self, amount: int): pass
`,
        cpp: `// Vending Machine - C++ Starter
class VendingState {
public:
    virtual ~VendingState() = default;
};
`
      }
    });

    // Problem 4: Distributed In-Memory Rate Limiter
    const rateLimiter = new Problem({
      id: 'rate-limiter',
      title: 'Design an Extensible In-Memory Rate Limiter',
      difficulty: 'Medium',
      category: 'Behavioral & Concurrency',
      estimatedTime: '40 mins',
      summary: 'Design a high-throughput, low-latency rate limiter library used by API Gateways. Support pluggable rate-limiting algorithms (Token Bucket, Sliding Window Log, Fixed Window), configurable client tiers, and thread-safe operations.',
      functionalRequirements: [
        'Check if an incoming request for a given (client_id, endpoint) is allowed: isAllowed(clientId, apiEndpoint).',
        'Support multiple algorithms: Token Bucket, Sliding Window Counter, and Fixed Window.',
        'Configure custom rules based on client tier (Free tier: 10 req/min, Enterprise: 1000 req/min).',
        'Return rate limit metadata: headers (Remaining, ResetTimeMs, RetryAfter).'
      ],
      nonFunctionalRequirements: [
        'Strategy Pattern: Algorithms interchangeable without altering the gateway interceptor.',
        'Thread safety: Atomic token replenishment and concurrency control under high QPS.',
        'Memory efficiency: Evict expired client states to avoid memory leaks.'
      ],
      constraints: ['Latency overhead must be under 1ms per decision.'],
      keyEntities: ['RateLimiter', 'RateLimitStrategy', 'TokenBucketStrategy', 'SlidingWindowStrategy', 'ClientRule', 'RateLimitResponse'],
      patternsTargeted: ['Strategy Pattern', 'Factory Pattern', 'Decorator Pattern'],
      checklist: [
        { id: 'c1', label: 'Rate limiting algorithms abstracted behind an IRateLimitStrategy', category: 'Strategy' },
        { id: 'c2', label: 'Thread-safety handled properly via synchronization or atomic operations', category: 'Concurrency' },
        { id: 'c3', label: 'Client tiers and rate rules cleanly decoupled from algorithm logic', category: 'SOLID' }
      ],
      changeScenarios: [
        {
          id: 'burst-tokens',
          title: 'Requirement Shift: Burst Capacity with Dynamic Throttling',
          prompt: 'Allow clients to consume up to 2x burst capacity for 5 seconds, followed by exponential backoff penalty if sustained.',
          affectedAreas: ['TokenBucketStrategy', 'ClientRule'],
          evaluationFocus: 'Can the algorithm state track burst intervals without breaking the isAllowed() interface contract?'
        }
      ],
      starterTemplates: {
        java: `// Rate Limiter - Java Starter
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

interface RateLimitAlgorithm {
    boolean allowRequest(String key, int maxRequests, long windowMillis);
}

class TokenBucketAlgorithm implements RateLimitAlgorithm {
    private final int capacity;
    private final double refillRatePerSecond;
    private double availableTokens;
    private long lastRefillTimestamp;

    public TokenBucketAlgorithm(int capacity, double refillRatePerSecond) {
        this.capacity = capacity;
        this.refillRatePerSecond = refillRatePerSecond;
        this.availableTokens = capacity;
        this.lastRefillTimestamp = System.currentTimeMillis();
    }

    public synchronized boolean allowRequest(String key, int maxRequests, long windowMillis) {
        refill();
        if (availableTokens >= 1) {
            availableTokens -= 1;
            return true;
        }
        return false;
    }

    private void refill() {
        long now = System.currentTimeMillis();
        double tokensToAdd = ((now - lastRefillTimestamp) / 1000.0) * refillRatePerSecond;
        availableTokens = Math.min(capacity, availableTokens + tokensToAdd);
        lastRefillTimestamp = now;
    }
}
`,
        typescript: `// Rate Limiter - TypeScript Starter
export interface RateLimitStrategy {
  allowRequest(clientId: string, maxRequests: number, windowMs: number): boolean;
}
`,
        python: `# Rate Limiter - Python Starter
from abc import ABC, abstractmethod

class RateLimitStrategy(ABC):
    @abstractmethod
    def allow_request(self, client_id: str, limit: int, window_sec: int) -> bool: pass
`,
        cpp: `// Rate Limiter - C++ Starter
class RateLimitStrategy {
public:
    virtual ~RateLimitStrategy() = default;
};
`
      }
    });

    this.problems.set(parkingLot.id, parkingLot);
    this.problems.set(elevatorSystem.id, elevatorSystem);
    this.problems.set(vendingMachine.id, vendingMachine);
    this.problems.set(rateLimiter.id, rateLimiter);
  }
}
