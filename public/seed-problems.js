var SEED_DATA = [
  {
    "id": "parking-lot",
    "title": "Design a Smart Multi-Floor Parking Lot",
    "difficulty": "Medium",
    "category": "Creational, Strategy & Concurrency",
    "estimatedTime": "45 mins",
    "summary": "Design an automated, multi-level parking lot system supporting multiple vehicle types, dynamic spot allocation strategies, fee computation, and concurrent entry/exit gate operations.",
    "functionalRequirements": [
      "Support multiple parking floors and multiple entry and exit gates operating concurrently.",
      "Support diverse vehicle types: Motorcycle, Compact Car, SUV/Truck, and Electric Vehicle (EV).",
      "Dynamically assign an available spot to an incoming vehicle based on a configurable allocation strategy (e.g., Nearest to Entrance, Best-Fit, or Lowest Floor First).",
      "Issue an entry ticket containing ticket ID, timestamp, assigned spot ID, and vehicle info.",
      "Calculate fees upon exit based on vehicle type and duration using a pluggable pricing strategy (e.g., Flat Rate, Hourly Tiered, Peak-hour Surge).",
      "Update display boards at each floor and entrance gate reflecting real-time free spot counts."
    ],
    "nonFunctionalRequirements": [
      "Thread-safety: Prevent race conditions when two gates attempt to allocate the last available spot simultaneously.",
      "Extensibility (Open/Closed): Easy addition of new vehicle types, spot types, or pricing models without modifying core lot controller.",
      "Separation of Concerns: Decouple ticket issuance, parking allocation, payment processing, and sensor/display notification."
    ],
    "constraints": [
      "In-memory design: Focus on class relationships, interfaces, and state transitions rather than database schemas or cloud infra.",
      "A vehicle can only park in a spot that accommodates its size (e.g., Truck cannot fit into Motorcycle spot)."
    ],
    "keyEntities": [
      "ParkingLot",
      "ParkingFloor",
      "ParkingSpot",
      "Vehicle",
      "Ticket",
      "ParkingStrategy",
      "PricingStrategy",
      "EntranceGate",
      "ExitGate",
      "DisplayBoard"
    ],
    "patternsTargeted": [
      "Strategy Pattern",
      "Factory Pattern",
      "Observer Pattern",
      "Singleton / Facade"
    ],
    "starterTemplates": {
      "java": "// Smart Parking Lot System - Starter Template\nimport java.util.*;\nimport java.util.concurrent.ConcurrentHashMap;\nimport java.util.concurrent.locks.ReentrantLock;\n\n// 1. Vehicle Hierarchy\nenum VehicleType { MOTORCYCLE, CAR, TRUCK, ELECTRIC }\n\nabstract class Vehicle {\n    private final String licensePlate;\n    private final VehicleType type;\n\n    public Vehicle(String licensePlate, VehicleType type) {\n        this.licensePlate = licensePlate;\n        this.type = type;\n    }\n    public String getLicensePlate() { return licensePlate; }\n    public VehicleType getType() { return type; }\n}\n\n// 2. Parking Spot Hierarchy\nenum SpotType { MOTORCYCLE, COMPACT, LARGE, ELECTRIC }\n\nclass ParkingSpot {\n    private final String id;\n    private final SpotType spotType;\n    private volatile boolean isOccupied;\n    private Vehicle currentVehicle;\n    private final ReentrantLock lock = new ReentrantLock();\n\n    public ParkingSpot(String id, SpotType spotType) {\n        this.id = id;\n        this.spotType = spotType;\n        this.isOccupied = false;\n    }\n\n    public boolean assignVehicle(Vehicle v) {\n        lock.lock();\n        try {\n            if (!isOccupied && canFitVehicle(v)) {\n                this.currentVehicle = v;\n                this.isOccupied = true;\n                return true;\n            }\n            return false;\n        } finally {\n            lock.unlock();\n        }\n    }\n\n    public void vacate() {\n        lock.lock();\n        try {\n            this.currentVehicle = null;\n            this.isOccupied = false;\n        } finally {\n            lock.unlock();\n        }\n    }\n\n    public boolean canFitVehicle(Vehicle v) {\n        // TODO: Map spot capacity to vehicle requirements\n        return true;\n    }\n\n    public String getId() { return id; }\n    public boolean isOccupied() { return isOccupied; }\n}\n\n// 3. Strategy Patterns for Allocation & Pricing\ninterface ParkingAllocationStrategy {\n    ParkingSpot findSpot(List<ParkingFloor> floors, Vehicle vehicle);\n}\n\ninterface PricingStrategy {\n    double calculateFee(Ticket ticket, Date exitTime);\n}\n\nclass HourlyPricingStrategy implements PricingStrategy {\n    private final double hourlyRate = 20.0;\n    @Override\n    public double calculateFee(Ticket ticket, Date exitTime) {\n        long durationMillis = exitTime.getTime() - ticket.getEntryTime().getTime();\n        long hours = (long) Math.ceil(durationMillis / (1000.0 * 60 * 60));\n        return Math.max(1, hours) * hourlyRate;\n    }\n}\n\n// 4. Ticket\nclass Ticket {\n    private final String ticketId;\n    private final String spotId;\n    private final Vehicle vehicle;\n    private final Date entryTime;\n\n    public Ticket(String ticketId, String spotId, Vehicle vehicle) {\n        this.ticketId = ticketId;\n        this.spotId = spotId;\n        this.vehicle = vehicle;\n        this.entryTime = new Date();\n    }\n    public Date getEntryTime() { return entryTime; }\n    public String getSpotId() { return spotId; }\n}\n\n// 5. Floor & Lot Facade\nclass ParkingFloor {\n    private final int floorNumber;\n    private final List<ParkingSpot> spots = new ArrayList<>();\n\n    public ParkingFloor(int floorNumber) { this.floorNumber = floorNumber; }\n    public void addSpot(ParkingSpot spot) { spots.add(spot); }\n    public List<ParkingSpot> getSpots() { return spots; }\n}\n\nclass ParkingLot {\n    private static ParkingLot instance;\n    private final List<ParkingFloor> floors = new ArrayList<>();\n    private ParkingAllocationStrategy allocationStrategy;\n    private PricingStrategy pricingStrategy;\n\n    private ParkingLot() {}\n\n    public static synchronized ParkingLot getInstance() {\n        if (instance == null) instance = new ParkingLot();\n        return instance;\n    }\n\n    public Ticket parkVehicle(Vehicle vehicle) {\n        // TODO: Implement parking flow using strategies\n        return null;\n    }\n\n    public double unparkVehicle(Ticket ticket) {\n        // TODO: Implement unparking & fee calculation\n        return 0.0;\n    }\n}",
      "typescript": "// Smart Parking Lot System - TypeScript Starter\nexport enum VehicleType { MOTORCYCLE, CAR, TRUCK, ELECTRIC }\nexport enum SpotType { MOTORCYCLE, COMPACT, LARGE, ELECTRIC }\n\nexport abstract class Vehicle {\n  constructor(public readonly licensePlate: string, public readonly type: VehicleType) {}\n}\n\nexport class Car extends Vehicle {\n  constructor(licensePlate: string) { super(licensePlate, VehicleType.CAR); }\n}\n\nexport class ParkingSpot {\n  private occupied = false;\n  private vehicle: Vehicle | null = null;\n\n  constructor(public readonly id: string, public readonly type: SpotType) {}\n\n  public isOccupied(): boolean { return this.occupied; }\n\n  public assignVehicle(v: Vehicle): boolean {\n    if (this.occupied) return false;\n    this.vehicle = v;\n    this.occupied = true;\n    return true;\n  }\n\n  public vacate(): void {\n    this.occupied = false;\n    this.vehicle = null;\n  }\n}\n\nexport interface IParkingStrategy {\n  findSpot(floors: ParkingFloor[], vehicle: Vehicle): ParkingSpot | null;\n}\n\nexport interface IPricingStrategy {\n  calculateFee(ticket: Ticket, exitTime: Date): number;\n}\n\nexport class HourlyPricingStrategy implements IPricingStrategy {\n  constructor(private hourlyRate: number = 20) {}\n  calculateFee(ticket: Ticket, exitTime: Date): number {\n    const hours = Math.max(1, Math.ceil((exitTime.getTime() - ticket.entryTime.getTime()) / 3600000));\n    return hours * this.hourlyRate;\n  }\n}\n\nexport class Ticket {\n  public readonly entryTime: Date = new Date();\n  constructor(\n    public readonly id: string,\n    public readonly spotId: string,\n    public readonly vehicle: Vehicle\n  ) {}\n}\n\nexport class ParkingFloor {\n  public spots: ParkingSpot[] = [];\n  constructor(public readonly floorNumber: number) {}\n}\n\nexport class ParkingLot {\n  private static instance: ParkingLot;\n  public floors: ParkingFloor[] = [];\n  public allocationStrategy!: IParkingStrategy;\n  public pricingStrategy: IPricingStrategy = new HourlyPricingStrategy();\n\n  public static getInstance(): ParkingLot {\n    if (!ParkingLot.instance) ParkingLot.instance = new ParkingLot();\n    return ParkingLot.instance;\n  }\n\n  public park(vehicle: Vehicle): Ticket | null {\n    const spot = this.allocationStrategy?.findSpot(this.floors, vehicle);\n    if (!spot || !spot.assignVehicle(vehicle)) return null;\n    return new Ticket(`TKT-${Date.now()}`, spot.id, vehicle);\n  }\n}",
      "python": "# Smart Parking Lot System - Python Starter\nfrom abc import ABC, abstractmethod\nfrom datetime import datetime\nimport threading\nfrom enum import Enum\n\nclass VehicleType(Enum):\n    MOTORCYCLE = 1\n    CAR = 2\n    TRUCK = 3\n    ELECTRIC = 4\n\nclass Vehicle:\n    def __init__(self, license_plate: str, vehicle_type: VehicleType):\n        self.license_plate = license_plate\n        self.type = vehicle_type\n\nclass ParkingSpot:\n    def __init__(self, spot_id: str, spot_type: VehicleType):\n        self.spot_id = spot_id\n        self.spot_type = spot_type\n        self.is_occupied = False\n        self.vehicle = None\n        self._lock = threading.Lock()\n\n    def assign(self, vehicle: Vehicle) -> bool:\n        with self._lock:\n            if not self.is_occupied:\n                self.is_occupied = True\n                self.vehicle = vehicle\n                return True\n            return False\n\n    def vacate(self):\n        with self._lock:\n            self.is_occupied = False\n            self.vehicle = None\n\nclass ParkingStrategy(ABC):\n    @abstractmethod\n    def find_spot(self, floors, vehicle: Vehicle):\n        pass\n\nclass PricingStrategy(ABC):\n    @abstractmethod\n    def calculate_fee(self, ticket, exit_time: datetime) -> float:\n        pass\n\nclass Ticket:\n    def __init__(self, ticket_id: str, spot_id: str, vehicle: Vehicle):\n        self.ticket_id = ticket_id\n        self.spot_id = spot_id\n        self.vehicle = vehicle\n        self.entry_time = datetime.now()\n",
      "cpp": "// Smart Parking Lot System - C++ Starter\n#include <iostream>\n#include <string>\n#include <vector>\n#include <memory>\n#include <mutex>\n#include <chrono>\n\nenum class VehicleType { MOTORCYCLE, CAR, TRUCK, ELECTRIC };\nenum class SpotType { MOTORCYCLE, COMPACT, LARGE, ELECTRIC };\n\nclass Vehicle {\nprotected:\n    std::string licensePlate;\n    VehicleType type;\npublic:\n    Vehicle(std::string plate, VehicleType t) : licensePlate(plate), type(t) {}\n    virtual ~Vehicle() = default;\n    VehicleType getType() const { return type; }\n};\n\nclass ParkingSpot {\nprivate:\n    std::string id;\n    SpotType type;\n    bool occupied = false;\n    std::shared_ptr<Vehicle> vehicle;\n    std::mutex mtx;\npublic:\n    ParkingSpot(std::string id, SpotType t) : id(id), type(t) {}\n    bool assignVehicle(std::shared_ptr<Vehicle> v) {\n        std::lock_guard<std::mutex> lock(mtx);\n        if (!occupied) {\n            occupied = true;\n            vehicle = v;\n            return true;\n        }\n        return false;\n    }\n    void vacate() {\n        std::lock_guard<std::mutex> lock(mtx);\n        occupied = false;\n        vehicle = nullptr;\n    }\n};\n"
    },
    "checklist": [
      {
        "id": "c1",
        "label": "Entities defined for Lot, Floor, Spot, Vehicle, and Ticket",
        "category": "Completeness"
      },
      {
        "id": "c2",
        "label": "Spot allocation logic uses Strategy Pattern (IParkingStrategy)",
        "category": "Design Patterns"
      },
      {
        "id": "c3",
        "label": "Fee calculation decoupled via IPricingStrategy",
        "category": "SOLID"
      },
      {
        "id": "c4",
        "label": "Thread-safety considerations addressed (locks or atomic status check)",
        "category": "Concurrency"
      },
      {
        "id": "c5",
        "label": "Display boards notified via Observer pattern or event publishing",
        "category": "Modularity"
      }
    ],
    "changeScenarios": [
      {
        "id": "ev-charging",
        "title": "Requirement Shift: EV Fast-Charging & kWh Metering",
        "prompt": "The parking lot wants to introduce dedicated EV charging spots that bill not only for parking duration but also for total kWh consumed via an external meter sensor.",
        "affectedAreas": [
          "ParkingSpot",
          "Ticket",
          "PricingStrategy",
          "ExitGate"
        ],
        "evaluationFocus": "Did you use a Strategy or Decorator pattern for pricing, or is duration-only pricing hardcoded inside Ticket/ExitGate?"
      },
      {
        "id": "valet-priority",
        "title": "Requirement Shift: Valet VIP Reservations",
        "prompt": "VIP customers can reserve prime spots 30 minutes in advance. If they arrive late, the spot is released back to the general pool.",
        "affectedAreas": [
          "ParkingSpot",
          "ParkingStrategy",
          "ReservationManager"
        ],
        "evaluationFocus": "Can spot states expand beyond FREE/OCCUPIED to RESERVED without breaking spot search algorithms?"
      }
    ]
  },
  {
    "id": "elevator-system",
    "title": "Design a Multi-Car Elevator Dispatcher System",
    "difficulty": "Hard",
    "category": "State Machine & Scheduling",
    "estimatedTime": "55 mins",
    "summary": "Design a multi-car elevator control system for a modern commercial high-rise building with N elevators and M floors. Focus on the State Pattern for individual elevator cabs, observer notifications for floor displays, and pluggable dispatching algorithms (e.g. SCAN / LOOK / Nearest-Car).",
    "functionalRequirements": [
      "Manage N elevator cars serving M floors concurrently.",
      "Accept external floor hall calls (e.g., Floor 4 requesting UP) and internal elevator destination button presses (e.g., Car 2 selecting Floor 10).",
      "Model elevator car states explicitly: IDLE, MOVING_UP, MOVING_DOWN, DOOR_OPEN, MAINTENANCE.",
      "Implement an intelligent Dispatcher to assign hall calls to the most optimal elevator car based on distance, direction, and pending requests.",
      "Handle door sensors (open, close, obstruction detected) and load limits (weight sensor triggering OVERLOAD state).",
      "Notify floor displays and waiting passengers of car arrival and travel direction."
    ],
    "nonFunctionalRequirements": [
      "State pattern: Each elevator car state should encapsulate its legal transitions and button-handling logic.",
      "Extensibility: Dispatching algorithm should be pluggable (e.g., Nearest Car vs. SCAN / LOOK vs. Energy Saving).",
      "Safety & Fault tolerance: Emergency stop and maintenance override modes must take immediate precedence."
    ],
    "constraints": [
      "Single request should not be served twice by different cars.",
      "Cars must service requests in directional order before reversing direction."
    ],
    "keyEntities": [
      "ElevatorController",
      "ElevatorCar",
      "ElevatorState",
      "MovingUpState",
      "MovingDownState",
      "IdleState",
      "HallRequest",
      "InternalButton",
      "DispatcherStrategy",
      "DoorSensor"
    ],
    "patternsTargeted": [
      "State Pattern",
      "Strategy Pattern",
      "Observer Pattern",
      "Command Pattern"
    ],
    "starterTemplates": {
      "java": "// Multi-Car Elevator System - Java Starter\nimport java.util.*;\n\nenum Direction { UP, DOWN, IDLE }\nenum DoorStatus { OPEN, CLOSED, OBSTRUCTED }\n\ninterface ElevatorState {\n    void handleHallRequest(ElevatorCar car, int floor, Direction direction);\n    void move(ElevatorCar car);\n    void openDoor(ElevatorCar car);\n    void closeDoor(ElevatorCar car);\n}\n\nclass IdleState implements ElevatorState {\n    public void handleHallRequest(ElevatorCar car, int floor, Direction direction) {\n        if (floor > car.getCurrentFloor()) {\n            car.setState(new MovingUpState());\n        } else if (floor < car.getCurrentFloor()) {\n            car.setState(new MovingDownState());\n        }\n    }\n    public void move(ElevatorCar car) { /* Stay put */ }\n    public void openDoor(ElevatorCar car) { car.setDoorStatus(DoorStatus.OPEN); }\n    public void closeDoor(ElevatorCar car) { car.setDoorStatus(DoorStatus.CLOSED); }\n}\n\nclass MovingUpState implements ElevatorState {\n    public void handleHallRequest(ElevatorCar car, int floor, Direction direction) {\n        car.addStop(floor);\n    }\n    public void move(ElevatorCar car) {\n        car.setCurrentFloor(car.getCurrentFloor() + 1);\n        if (car.shouldStopAt(car.getCurrentFloor())) {\n            car.openDoor();\n        }\n    }\n    public void openDoor(ElevatorCar car) { /* Cannot open while moving */ }\n    public void closeDoor(ElevatorCar car) { car.setDoorStatus(DoorStatus.CLOSED); }\n}\n\nclass MovingDownState implements ElevatorState {\n    public void handleHallRequest(ElevatorCar car, int floor, Direction direction) {\n        car.addStop(floor);\n    }\n    public void move(ElevatorCar car) {\n        car.setCurrentFloor(car.getCurrentFloor() - 1);\n    }\n    public void openDoor(ElevatorCar car) { /* Cannot open while moving */ }\n    public void closeDoor(ElevatorCar car) { car.setDoorStatus(DoorStatus.CLOSED); }\n}\n\ninterface DispatcherStrategy {\n    ElevatorCar selectElevator(List<ElevatorCar> cars, int requestedFloor, Direction direction);\n}\n\nclass ElevatorCar {\n    private final int id;\n    private int currentFloor = 1;\n    private ElevatorState state = new IdleState();\n    private DoorStatus doorStatus = DoorStatus.CLOSED;\n    private final TreeSet<Integer> upStops = new TreeSet<>();\n    private final TreeSet<Integer> downStops = new TreeSet<>(Collections.reverseOrder());\n\n    public ElevatorCar(int id) { this.id = id; }\n    public void setState(ElevatorState s) { this.state = s; }\n    public void setDoorStatus(DoorStatus d) { this.doorStatus = d; }\n    public int getCurrentFloor() { return currentFloor; }\n    public void setCurrentFloor(int f) { this.currentFloor = f; }\n    public void addStop(int f) { upStops.add(f); }\n    public boolean shouldStopAt(int f) { return upStops.contains(f); }\n    public void openDoor() { state.openDoor(this); }\n}\n",
      "typescript": "// Multi-Car Elevator System - TypeScript Starter\nexport enum Direction { UP = 'UP', DOWN = 'DOWN', IDLE = 'IDLE' }\n\nexport interface ElevatorState {\n  move(car: ElevatorCar): void;\n  openDoor(car: ElevatorCar): void;\n  closeDoor(car: ElevatorCar): void;\n}\n\nexport class IdleState implements ElevatorState {\n  move(car: ElevatorCar): void { /* No-op */ }\n  openDoor(car: ElevatorCar): void { car.isDoorOpen = true; }\n  closeDoor(car: ElevatorCar): void { car.isDoorOpen = false; }\n}\n\nexport class MovingUpState implements ElevatorState {\n  move(car: ElevatorCar): void {\n    car.currentFloor += 1;\n  }\n  openDoor(car: ElevatorCar): void { throw new Error('Cannot open door while moving'); }\n  closeDoor(car: ElevatorCar): void { car.isDoorOpen = false; }\n}\n\nexport interface IDispatcherStrategy {\n  dispatch(cars: ElevatorCar[], floor: number, direction: Direction): ElevatorCar;\n}\n\nexport class ElevatorCar {\n  public currentFloor = 1;\n  public isDoorOpen = false;\n  public state: ElevatorState = new IdleState();\n\n  constructor(public readonly id: number) {}\n\n  public requestFloor(floor: number): void {\n    if (floor > this.currentFloor) {\n      this.state = new MovingUpState();\n    }\n  }\n}\n",
      "python": "# Multi-Car Elevator System - Python Starter\nfrom abc import ABC, abstractmethod\nfrom enum import Enum\n\nclass Direction(Enum):\n    UP = 1\n    DOWN = 2\n    IDLE = 3\n\nclass ElevatorState(ABC):\n    @abstractmethod\n    def move(self, car): pass\n\nclass IdleState(ElevatorState):\n    def move(self, car):\n        pass\n\nclass ElevatorCar:\n    def __init__(self, car_id: int):\n        self.id = car_id\n        self.current_floor = 1\n        self.state = IdleState()\n        self.is_door_open = False\n",
      "cpp": "// Multi-Car Elevator System - C++ Starter\n#include <iostream>\n#include <vector>\n#include <memory>\n\nenum class Direction { UP, DOWN, IDLE };\n\nclass ElevatorCar;\n\nclass ElevatorState {\npublic:\n    virtual ~ElevatorState() = default;\n    virtual void move(ElevatorCar& car) = 0;\n};\n"
    },
    "checklist": [
      {
        "id": "c1",
        "label": "Elevator states modeled with State Pattern (avoiding giant switch statements)",
        "category": "Design Patterns"
      },
      {
        "id": "c2",
        "label": "Dispatcher strategy decoupled via interface",
        "category": "SOLID"
      },
      {
        "id": "c3",
        "label": "Distinction between external hall requests and internal car buttons",
        "category": "Domain Modeling"
      },
      {
        "id": "c4",
        "label": "Safe state transitions (e.g., cannot move while door is open)",
        "category": "State Management"
      }
    ],
    "changeScenarios": [
      {
        "id": "vip-override",
        "title": "Requirement Shift: VIP Penthouse / Firefighter Override Mode",
        "prompt": "Building security initiates a Fire Emergency or VIP Priority ride. An elevator must cancel all current hall calls, travel directly to the designated floor non-stop, and lock out regular passenger input.",
        "affectedAreas": [
          "ElevatorCar",
          "ElevatorState",
          "ElevatorController"
        ],
        "evaluationFocus": "Can emergency / override behavior be injected cleanly via a state or decorator without modifying every movement method?"
      }
    ]
  },
  {
    "id": "vending-machine",
    "title": "Design a Smart Snack & Beverage Vending Machine",
    "difficulty": "Easy",
    "category": "State Pattern & Strategy",
    "estimatedTime": "35 mins",
    "summary": "Design the low-level domain for a modern automated vending machine. Handle item selection, multi-currency cash & contactless payments, coin change dispensing, and safe state machine transitions (Idle, HasMoney, Dispensing, SoldOut).",
    "functionalRequirements": [
      "Inventory management with distinct slots (rack, row, price, stock count).",
      "State transitions: IDLE -> HAS_MONEY -> DISPENSING -> SOLD_OUT.",
      "Support multiple payment methods: Cash/Coin, Credit Card, NFC Mobile.",
      "Calculate and dispense exact change using available cash inventory.",
      "Allow user cancellation before dispensing with full refund."
    ],
    "nonFunctionalRequirements": [
      "State Pattern to prevent invalid operations (e.g. dispensing before paying).",
      "Strategy pattern for payments to easily plug in new processors."
    ],
    "constraints": [
      "Machine must ensure item is physically dropped before decrementing stock."
    ],
    "keyEntities": [
      "VendingMachine",
      "VendingState",
      "Inventory",
      "ItemSlot",
      "Item",
      "PaymentStrategy",
      "CoinDispenser"
    ],
    "patternsTargeted": [
      "State Pattern",
      "Strategy Pattern",
      "Factory Pattern"
    ],
    "starterTemplates": {
      "java": "// Vending Machine - Java Starter\nimport java.util.*;\n\nenum Coin { NICKEL(5), DIME(10), QUARTER(25), DOLLAR(100); private final int value; Coin(int v) { this.value = v; } public int getValue() { return value; } }\n\ninterface VendingMachineState {\n    void selectItem(VendingMachine machine, String code);\n    void insertMoney(VendingMachine machine, int amount);\n    void dispenseItem(VendingMachine machine);\n    void cancelTransaction(VendingMachine machine);\n}\n\nclass IdleState implements VendingMachineState {\n    public void selectItem(VendingMachine machine, String code) {\n        System.out.println(\"Item selected: \" + code);\n        machine.setState(machine.getHasMoneyState());\n    }\n    public void insertMoney(VendingMachine machine, int amount) {\n        machine.addBalance(amount);\n        machine.setState(machine.getHasMoneyState());\n    }\n    public void dispenseItem(VendingMachine machine) {\n        System.out.println(\"Please select item and insert money first.\");\n    }\n    public void cancelTransaction(VendingMachine machine) {\n        System.out.println(\"No active transaction.\");\n    }\n}\n\nclass VendingMachine {\n    private VendingMachineState state = new IdleState();\n    private final VendingMachineState hasMoneyState = new IdleState(); // replace with concrete\n    private int currentBalance = 0;\n\n    public void setState(VendingMachineState state) { this.state = state; }\n    public VendingMachineState getHasMoneyState() { return hasMoneyState; }\n    public void addBalance(int amt) { this.currentBalance += amt; }\n    public int getBalance() { return currentBalance; }\n}\n",
      "typescript": "// Vending Machine - TypeScript Starter\nexport interface VendingState {\n  selectItem(code: string): void;\n  insertMoney(amount: number): void;\n  dispense(): void;\n  cancel(): void;\n}\n",
      "python": "# Vending Machine - Python Starter\nfrom abc import ABC, abstractmethod\n\nclass VendingState(ABC):\n    @abstractmethod\n    def insert_money(self, amount: int): pass\n",
      "cpp": "// Vending Machine - C++ Starter\nclass VendingState {\npublic:\n    virtual ~VendingState() = default;\n};\n"
    },
    "checklist": [
      {
        "id": "c1",
        "label": "VendingMachine state transitions encapsulated in State classes",
        "category": "Design Patterns"
      },
      {
        "id": "c2",
        "label": "Item inventory separated from machine state",
        "category": "SOLID"
      },
      {
        "id": "c3",
        "label": "Payment decoupled via PaymentStrategy",
        "category": "Extensibility"
      }
    ],
    "changeScenarios": [
      {
        "id": "bogo-promo",
        "title": "Requirement Shift: Buy-One-Get-One (BOGO) & Promo Discounts",
        "prompt": "Marketing wants to offer flash happy-hour discounts and BOGO promotions without changing vending machine state logic.",
        "affectedAreas": [
          "ItemSlot",
          "PricingEngine",
          "PaymentStrategy"
        ],
        "evaluationFocus": "Is item price hardcoded or evaluated through a pricing decorator/strategy?"
      }
    ]
  },
  {
    "id": "rate-limiter",
    "title": "Design an Extensible In-Memory Rate Limiter",
    "difficulty": "Medium",
    "category": "Behavioral & Concurrency",
    "estimatedTime": "40 mins",
    "summary": "Design a high-throughput, low-latency rate limiter library used by API Gateways. Support pluggable rate-limiting algorithms (Token Bucket, Sliding Window Log, Fixed Window), configurable client tiers, and thread-safe operations.",
    "functionalRequirements": [
      "Check if an incoming request for a given (client_id, endpoint) is allowed: isAllowed(clientId, apiEndpoint).",
      "Support multiple algorithms: Token Bucket, Sliding Window Counter, and Fixed Window.",
      "Configure custom rules based on client tier (Free tier: 10 req/min, Enterprise: 1000 req/min).",
      "Return rate limit metadata: headers (Remaining, ResetTimeMs, RetryAfter)."
    ],
    "nonFunctionalRequirements": [
      "Strategy Pattern: Algorithms interchangeable without altering the gateway interceptor.",
      "Thread safety: Atomic token replenishment and concurrency control under high QPS.",
      "Memory efficiency: Evict expired client states to avoid memory leaks."
    ],
    "constraints": [
      "Latency overhead must be under 1ms per decision."
    ],
    "keyEntities": [
      "RateLimiter",
      "RateLimitStrategy",
      "TokenBucketStrategy",
      "SlidingWindowStrategy",
      "ClientRule",
      "RateLimitResponse"
    ],
    "patternsTargeted": [
      "Strategy Pattern",
      "Factory Pattern",
      "Decorator Pattern"
    ],
    "starterTemplates": {
      "java": "// Rate Limiter - Java Starter\nimport java.util.concurrent.ConcurrentHashMap;\nimport java.util.concurrent.atomic.AtomicLong;\n\ninterface RateLimitAlgorithm {\n    boolean allowRequest(String key, int maxRequests, long windowMillis);\n}\n\nclass TokenBucketAlgorithm implements RateLimitAlgorithm {\n    private final int capacity;\n    private final double refillRatePerSecond;\n    private double availableTokens;\n    private long lastRefillTimestamp;\n\n    public TokenBucketAlgorithm(int capacity, double refillRatePerSecond) {\n        this.capacity = capacity;\n        this.refillRatePerSecond = refillRatePerSecond;\n        this.availableTokens = capacity;\n        this.lastRefillTimestamp = System.currentTimeMillis();\n    }\n\n    public synchronized boolean allowRequest(String key, int maxRequests, long windowMillis) {\n        refill();\n        if (availableTokens >= 1) {\n            availableTokens -= 1;\n            return true;\n        }\n        return false;\n    }\n\n    private void refill() {\n        long now = System.currentTimeMillis();\n        double tokensToAdd = ((now - lastRefillTimestamp) / 1000.0) * refillRatePerSecond;\n        availableTokens = Math.min(capacity, availableTokens + tokensToAdd);\n        lastRefillTimestamp = now;\n    }\n}\n",
      "typescript": "// Rate Limiter - TypeScript Starter\nexport interface RateLimitStrategy {\n  allowRequest(clientId: string, maxRequests: number, windowMs: number): boolean;\n}\n",
      "python": "# Rate Limiter - Python Starter\nfrom abc import ABC, abstractmethod\n\nclass RateLimitStrategy(ABC):\n    @abstractmethod\n    def allow_request(self, client_id: str, limit: int, window_sec: int) -> bool: pass\n",
      "cpp": "// Rate Limiter - C++ Starter\nclass RateLimitStrategy {\npublic:\n    virtual ~RateLimitStrategy() = default;\n};\n"
    },
    "checklist": [
      {
        "id": "c1",
        "label": "Rate limiting algorithms abstracted behind an IRateLimitStrategy",
        "category": "Strategy"
      },
      {
        "id": "c2",
        "label": "Thread-safety handled properly via synchronization or atomic operations",
        "category": "Concurrency"
      },
      {
        "id": "c3",
        "label": "Client tiers and rate rules cleanly decoupled from algorithm logic",
        "category": "SOLID"
      }
    ],
    "changeScenarios": [
      {
        "id": "burst-tokens",
        "title": "Requirement Shift: Burst Capacity with Dynamic Throttling",
        "prompt": "Allow clients to consume up to 2x burst capacity for 5 seconds, followed by exponential backoff penalty if sustained.",
        "affectedAreas": [
          "TokenBucketStrategy",
          "ClientRule"
        ],
        "evaluationFocus": "Can the algorithm state track burst intervals without breaking the isAllowed() interface contract?"
      }
    ]
  }
];
if (typeof window !== 'undefined') window.SEED_PROBLEMS = SEED_DATA;
if (typeof global !== 'undefined') global.SEED_PROBLEMS = SEED_DATA;